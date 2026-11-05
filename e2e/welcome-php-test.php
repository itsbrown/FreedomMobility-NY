<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/public/api/welcome-lib.php';

$failed = 0;

function expect(bool $condition, string $message): void
{
    global $failed;
    if ($condition) {
        echo "ok  $message\n";
        return;
    }
    $failed++;
    echo "FAIL $message\n";
}

$disabled = fm_welcome_normalize_config([
    'supabase_url' => '',
    'service_role_key' => '',
    'enabled' => false,
]);
expect($disabled['enabled'] === false, 'missing credentials stay disabled');

$badUrl = fm_welcome_normalize_config([
    'supabase_url' => 'https://example.com',
    'service_role_key' => str_repeat('k', 24),
    'enabled' => true,
]);
expect($badUrl['enabled'] === false, 'non-supabase URL cannot enable the loop');

$enabled = fm_welcome_normalize_config([
    'supabase_url' => 'https://freedom-example.supabase.co',
    'service_role_key' => str_repeat('k', 24),
    'enabled' => 'true',
    'holdout_percent' => '10',
    'cookie_days' => '30',
]);
expect($enabled['enabled'] === true, 'complete Freedom config can enable the loop');
expect($enabled['cookie_seconds'] === 30 * 86400, 'cookie lifetime defaults through 30 days');

$longCookie = fm_welcome_normalize_config([
    'supabase_url' => 'https://freedom-example.supabase.co',
    'service_role_key' => str_repeat('k', 24),
    'enabled' => true,
    'cookie_days' => '365',
]);
expect($longCookie['enabled'] === false, 'cookie lifetime above 90 days fails closed');

$calls = [];
$transport = function (string $method, string $path, ?array $payload) use (&$calls): array {
    $calls[] = [$method, $path, $payload];
    if (str_contains($path, 'welcome_visitors') && $method === 'GET') {
        return ['status' => 200, 'body' => []];
    }
    if ($method === 'POST') {
        return ['status' => 201, 'body' => []];
    }
    return ['status' => 500, 'body' => null];
};

$off = fm_welcome_handle_visit(
    ['REQUEST_METHOD' => 'POST', 'HTTPS' => 'on'],
    json_encode(['page' => '/?email=person@example.com', 'referrer_host' => 'https://news.example/a?e=person@example.com']),
    ['utm_campaign' => 'person@example.com', 'utm_medium' => 'email', 'rh_c' => 'preview-secret', 'fm_c' => 'Spring-Stairs'],
    $disabled,
    $transport
);
expect($off['body']['personalization'] === false, 'disabled visit does not personalize');
expect($calls === [], 'disabled visit does not call storage');
expect(!isset($off['body']['profile']), 'disabled visit has no profile');
$cookieHeaders = array_values(array_filter($off['headers'], fn($h) => str_starts_with($h, 'Set-Cookie:')));
expect($cookieHeaders === [], 'disabled visit does not set a cookie');

$get = fm_welcome_handle_visit(['REQUEST_METHOD' => 'GET', 'HTTPS' => 'on'], '', [], $enabled, $transport);
expect($get['status'] === 405, 'GET visit is rejected');

$opt = fm_welcome_handle_visit(
    ['REQUEST_METHOD' => 'POST', 'HTTPS' => 'on', 'HTTP_DNT' => '1'],
    json_encode(['page' => '/']),
    [],
    $enabled,
    $transport
);
expect($opt['body']['personalization'] === false, 'Do Not Track does not personalize');
expect($calls === [], 'Do Not Track does not write a visit');
$optCookie = implode("\n", $opt['headers']);
expect(str_contains($optCookie, 'fm_vid='), 'opt-out clears fm_vid');
expect(str_contains($optCookie, 'Max-Age=0'), 'opt-out cookie expires immediately');
expect(str_contains($optCookie, 'HttpOnly'), 'opt-out cookie is HttpOnly');
expect(str_contains($optCookie, 'SameSite=Lax'), 'opt-out cookie is SameSite=Lax');
expect(str_contains($optCookie, 'Secure'), 'HTTPS opt-out cookie is Secure');

$on = fm_welcome_handle_visit(
    ['REQUEST_METHOD' => 'POST', 'HTTPS' => 'on'],
    json_encode([
        'page' => '/contact?email=person@example.com',
        'referrer_host' => 'https://news.example/path?email=person@example.com',
        'email' => 'person@example.com',
        'ip' => '203.0.113.5',
    ]),
    [
        'utm_source' => 'newsletter',
        'utm_medium' => 'Email',
        'utm_campaign' => 'preview-secret',
        'utm_content' => 'person@example.com',
        'fm_c' => 'Spring-Stairs',
        'gclid' => 'should-drop',
    ],
    $enabled,
    $transport
);
expect($on['body']['personalization'] === true, 'enabled visit returns a profile');
expect(is_bool($on['body']['profile']['holdout']), 'holdout is a boolean');
$set = implode("\n", $on['headers']);
expect(str_contains($set, 'HttpOnly') && str_contains($set, 'Secure') && str_contains($set, 'SameSite=Lax'), 'visitor cookie is HttpOnly Secure SameSite=Lax');
expect(!str_contains($set, 'Domain='), 'cookie is host-only');
expect(!str_contains(json_encode($on['body']), 'person@example.com'), 'response has no email');

$visitWrite = null;
foreach ($calls as $call) {
    if ($call[0] === 'POST' && str_contains($call[1], 'welcome_visits')) {
        $visitWrite = $call[2];
    }
}
expect(is_array($visitWrite), 'enabled visit writes one visit row');
expect($visitWrite['page_path'] === '/contact', 'page path drops the query');
expect($visitWrite['referrer_host'] === 'news.example', 'referrer keeps only the host');
expect($visitWrite['utm_medium'] === 'email', 'medium is normalized');
expect($visitWrite['utm_campaign'] === 'preview', 'preview token is collapsed');
expect($visitWrite['utm_content'] === '', 'email-like content is dropped');
expect($visitWrite['campaign_key'] === 'spring-stairs', 'fm_c becomes the campaign slug');
expect(!array_key_exists('ip', $visitWrite) && !array_key_exists('email', $visitWrite), 'visit row has no ip or email');
expect(!array_key_exists('gclid', $visitWrite), 'unlisted query params are not stored');

$again = [];
$stable = function (string $method, string $path, ?array $payload) use (&$again, $on): array {
    $again[] = [$method, $path, $payload];
    if ($method === 'GET') {
        return ['status' => 200, 'body' => [[
            'visitor_id' => '11111111-1111-4111-8111-111111111111',
            'holdout' => true,
        ]]];
    }
    return ['status' => 201, 'body' => []];
};
preg_match('/fm_vid=([^;]+)/', $set, $cookieMatch);
$returnVisit = fm_welcome_handle_visit(
    ['REQUEST_METHOD' => 'POST', 'HTTP_X_FORWARDED_PROTO' => 'https', 'HTTP_COOKIE' => 'fm_vid=' . $cookieMatch[1]],
    json_encode(['page' => '/']),
    [],
    $enabled,
    $stable
);
expect($returnVisit['body']['profile']['holdout'] === true, 'stored holdout is reused');
$insertedVisitor = array_values(array_filter($again, fn($call) => $call[0] === 'POST' && str_contains($call[1], 'welcome_visitors')));
expect($insertedVisitor === [], 'an existing visitor is not inserted again');

$plainHttp = fm_welcome_cookie_header('11111111-1111-4111-8111-111111111111', 100, false, false);
expect(str_contains($plainHttp, 'HttpOnly') && !str_contains($plainHttp, 'Secure'), 'HTTP cookie stays HttpOnly and omits Secure');

$variantCalls = 0;
$variantTransport = function () use (&$variantCalls): array {
    $variantCalls++;
    return ['status' => 200, 'body' => [[
        'id' => '11111111-1111-4111-8111-111111111111',
        'status' => 'approved',
        'slot' => 'hero',
        'segment' => 'spring-stairs',
        'copy' => [
            'eyebrow' => 'Freedom Mobility LLC',
            'headline' => 'A stairlift that fits <script>',
            'subhead' => 'Local installers.',
            'cta' => 'Book',
            'cta_href' => '/contact',
        ],
    ], [
        'id' => '22222222-2222-4222-8222-222222222222',
        'status' => 'draft',
        'slot' => 'hero',
        'segment' => 'spring-stairs',
        'copy' => [
            'eyebrow' => 'Draft',
            'headline' => 'Do not show',
            'subhead' => 'Draft subhead',
            'cta' => 'Go',
            'cta_href' => '/contact',
        ],
    ], [
        'id' => '33333333-3333-4333-8333-333333333333',
        'status' => 'approved',
        'slot' => 'hero',
        'segment' => 'spring-stairs',
        'copy' => [
            'eyebrow' => 'Approved',
            'headline' => 'Stairs getting hard at home?',
            'subhead' => 'Free in-home visits in Rochester, Buffalo, and Syracuse.',
            'cta' => 'Schedule a visit',
            'cta_href' => 'https://evil.example',
        ],
    ], [
        'id' => '44444444-4444-4444-8444-444444444444',
        'status' => 'approved',
        'slot' => 'hero',
        'segment' => 'spring-stairs',
        'copy' => [
            'eyebrow' => 'Freedom Mobility LLC',
            'headline' => 'Stairs getting hard at home?',
            'subhead' => 'Free in-home visits in Rochester, Buffalo, and Syracuse.',
            'cta' => 'Schedule a visit',
            'cta_href' => '/contact',
        ],
    ]]];
};

$blockedVariants = fm_welcome_handle_variants(
    ['REQUEST_METHOD' => 'GET'],
    ['slot' => 'hero', 'rh_c' => 'spring-stairs'],
    $disabled,
    $variantTransport
);
expect($blockedVariants['body']['personalization'] === false, 'variants stay off without approval config');
expect($variantCalls === 0, 'disabled variants do not query storage');

$variants = fm_welcome_handle_variants(
    ['REQUEST_METHOD' => 'GET'],
    ['slot' => 'hero', 'rh_c' => 'spring-stairs'],
    $enabled,
    $variantTransport
);
expect($variants['body']['personalization'] === true, 'enabled variants endpoint is on');
expect(count($variants['body']['variants']) === 1, 'only the safe approved variant is returned');
expect($variants['body']['variants'][0]['id'] === '44444444-4444-4444-8444-444444444444', 'the LLC headline is allowed when it is plain text');
expect($variants['body']['variants'][0]['copy']['cta_href'] === '/contact', 'returned CTA stays on the allowlist');

$same = fm_welcome_holdout('11111111-1111-4111-8111-111111111111', 10);
expect($same === fm_welcome_holdout('11111111-1111-4111-8111-111111111111', 10), 'holdout assignment is stable');
expect(fm_welcome_holdout('11111111-1111-4111-8111-111111111111', 0) === false, 'zero percent holdout assigns nobody');

$lib = file_get_contents(dirname(__DIR__) . '/public/api/welcome-lib.php');
expect(!str_contains($lib, 'REMOTE_ADDR') && !str_contains($lib, 'G-E42WXVRWT2'), 'library does not read REMOTE_ADDR or the RHTS measurement id');
expect(!str_contains($lib, 'rochesterhealthtech'), 'library does not name the RHTS database');

if ($failed > 0) {
    fwrite(STDERR, "$failed failed\n");
    exit(1);
}
echo "all php welcome checks passed\n";
