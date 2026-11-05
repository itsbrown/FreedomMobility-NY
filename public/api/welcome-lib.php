<?php
/**
 * Freedom Mobility NY Welcome Loop. First-party only.
 *
 * This is not the Rochester HealthTech database. The reference repository was
 * not readable; the request/response contract matches the public RHTS client
 * (POST visit, GET approved variants, HttpOnly cookie) with the fail-closed
 * changes described in docs/welcome-loop.md.
 *
 * No IP address, email, name, or form body is stored.
 */
declare(strict_types=1);

const FM_WELCOME_COOKIE = 'fm_vid';
const FM_WELCOME_UUID = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';
const FM_WELCOME_SLUG = '/^[a-z0-9][a-z0-9-]{0,63}$/';
const FM_WELCOME_TOKEN = '/^[A-Za-z0-9._~+-]{1,80}$/';
const FM_WELCOME_CTA = [
    '/contact',
    '/stairs-where-to-start',
    '/stairlifts',
    '/ramps',
    '/vertical-platform-lifts',
    '/resources',
];

function fm_welcome_config_path_allowed(string $path): bool
{
    if ($path === '' || $path[0] !== '/') {
        return false;
    }
    $real = realpath($path);
    if ($real === false || !is_file($real)) {
        return false;
    }
    $apiDir = realpath(__DIR__);
    if ($apiDir !== false && str_starts_with($real, $apiDir . DIRECTORY_SEPARATOR)) {
        return false;
    }
    return true;
}

function fm_welcome_normalize_config(array $raw): array
{
    $url = rtrim(trim((string)($raw['supabase_url'] ?? '')), '/');
    $key = trim((string)($raw['service_role_key'] ?? ''));
    $enabledFlag = ($raw['enabled'] ?? false) === true || ($raw['enabled'] ?? '') === 'true';
    $percentRaw = $raw['holdout_percent'] ?? null;
    $daysRaw = $raw['cookie_days'] ?? null;
    if ($percentRaw === null || $percentRaw === '') {
        $percentRaw = 10;
    }
    if ($daysRaw === null || $daysRaw === '') {
        $daysRaw = 30;
    }
    $percentOk = is_int($percentRaw) || (is_string($percentRaw) && preg_match('/^\d{1,3}$/', $percentRaw));
    $daysOk = is_int($daysRaw) || (is_string($daysRaw) && preg_match('/^\d{1,3}$/', $daysRaw));
    $percent = $percentOk ? (int)$percentRaw : -1;
    $days = $daysOk ? (int)$daysRaw : -1;
    $urlOk = (bool)preg_match('#^https://[a-z0-9-]+\.supabase\.co$#', $url);
    $keyOk = $key !== '' && strlen($key) >= 20 && preg_match('/^\S+$/', $key) === 1;
    $rangeOk = $percent >= 0 && $percent <= 100 && $days >= 1 && $days <= 90;
    $enabled = $enabledFlag && $urlOk && $keyOk && $rangeOk && function_exists('curl_init');

    return [
        'enabled' => $enabled,
        'supabase_url' => $urlOk ? $url : '',
        'service_role_key' => $keyOk ? $key : '',
        'holdout_percent' => ($percent >= 0 && $percent <= 100) ? $percent : 10,
        'cookie_seconds' => (($days >= 1 && $days <= 90) ? $days : 30) * 86400,
    ];
}

function fm_welcome_load_config(): array
{
    $raw = [
        'supabase_url' => getenv('FM_SUPABASE_URL') ?: '',
        'service_role_key' => getenv('FM_SUPABASE_SERVICE_ROLE_KEY') ?: '',
        'enabled' => getenv('FM_WELCOME_ENABLED') === false ? null : (getenv('FM_WELCOME_ENABLED') === 'true'),
        'holdout_percent' => getenv('FM_WELCOME_HOLDOUT_PERCENT') === false ? null : getenv('FM_WELCOME_HOLDOUT_PERCENT'),
        'cookie_days' => getenv('FM_WELCOME_COOKIE_DAYS') === false ? null : getenv('FM_WELCOME_COOKIE_DAYS'),
    ];
    $path = getenv('FM_WELCOME_CONFIG') ?: '';
    if (is_string($path) && fm_welcome_config_path_allowed($path)) {
        $file = include $path;
        if (is_array($file)) {
            foreach (['supabase_url', 'service_role_key', 'enabled', 'holdout_percent', 'cookie_days'] as $field) {
                $current = $raw[$field] ?? null;
                $missing = $current === '' || $current === false || $current === null;
                if ($missing && array_key_exists($field, $file)) {
                    $raw[$field] = $file[$field];
                }
            }
        }
    }
    return fm_welcome_normalize_config($raw);
}

function fm_welcome_page_path(string $value): string
{
    $path = trim($value);
    if (preg_match('#^https?://#i', $path)) {
        $parsed = parse_url($path, PHP_URL_PATH);
        $path = is_string($parsed) ? $parsed : '/';
    }
    $cut = strcspn($path, '?#');
    $path = substr($path, 0, $cut);
    if ($path === '') {
        $path = '/';
    }
    if ($path[0] !== '/') {
        $path = '/' . $path;
    }
    if (strlen($path) > 180 || str_contains($path, '@') || str_contains($path, '..')) {
        return '/';
    }
    if (!preg_match('#^/[A-Za-z0-9._~/-]*$#', $path)) {
        return '/';
    }
    return $path;
}

function fm_welcome_token(?string $value): string
{
    $token = trim((string)$value);
    if ($token === '' || strlen($token) > 80) {
        return '';
    }
    if (!preg_match(FM_WELCOME_TOKEN, $token) || str_contains($token, '@')) {
        return '';
    }
    if (preg_match('/^preview-/i', $token)) {
        return 'preview';
    }
    return $token;
}

function fm_welcome_slug(?string $value): string
{
    $token = strtolower(fm_welcome_token($value));
    if ($token === '' || $token === 'preview') {
        return '';
    }
    return preg_match(FM_WELCOME_SLUG, $token) ? $token : '';
}

function fm_welcome_referrer_host(?string $value): string
{
    $value = trim((string)$value);
    if ($value === '') {
        return '';
    }
    if (preg_match('#^https?://#i', $value)) {
        $host = parse_url($value, PHP_URL_HOST);
        $value = is_string($host) ? $host : '';
    }
    $host = strtolower($value);
    if ($host === '' || strlen($host) > 253 || str_contains($host, '@')) {
        return '';
    }
    return preg_match('/^[a-z0-9.-]+$/', $host) ? $host : '';
}

function fm_welcome_uuid(): string
{
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return sprintf(
        '%s-%s-%s-%s-%s',
        substr($hex, 0, 8),
        substr($hex, 8, 4),
        substr($hex, 12, 4),
        substr($hex, 16, 4),
        substr($hex, 20, 12)
    );
}

function fm_welcome_valid_uuid(string $value): bool
{
    return (bool)preg_match(FM_WELCOME_UUID, $value);
}

function fm_welcome_holdout(string $visitorId, int $percent): bool
{
    if ($percent <= 0) {
        return false;
    }
    if ($percent >= 100) {
        return true;
    }
    $n = hexdec(substr(hash('sha256', strtolower($visitorId) . '|fm-welcome-v1'), 0, 8));
    return ($n % 100) < $percent;
}

function fm_welcome_request_is_secure(array $server): bool
{
    if (strtolower((string)($server['HTTPS'] ?? '')) === 'on' || ($server['HTTPS'] ?? '') === '1') {
        return true;
    }
    return strtolower((string)($server['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
}

function fm_welcome_cookie_header(string $value, int $maxAge, bool $secure, bool $clear = false): string
{
    $parts = [
        FM_WELCOME_COOKIE . '=' . ($clear ? '' : $value),
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=' . ($clear ? '0' : (string)$maxAge),
    ];
    if ($secure) {
        $parts[] = 'Secure';
    }
    return implode('; ', $parts);
}

function fm_welcome_clean_copy(mixed $value, int $max): string
{
    if (!is_string($value)) {
        return '';
    }
    $text = trim($value);
    if ($text === '' || strlen($text) > $max) {
        return '';
    }
    if (preg_match('/[<>]|@|mailto:|javascript:|data:|https?:\\/\\//i', $text)) {
        return '';
    }
    if (preg_match('/[\\x00-\\x1F\\x7F]/', $text)) {
        return '';
    }
    return $text;
}

function fm_welcome_validate_variant(mixed $variant, string $campaign): ?array
{
    if (!is_array($variant) || !preg_match(FM_WELCOME_SLUG, $campaign)) {
        return null;
    }
    $id = strtolower((string)($variant['id'] ?? ''));
    if (($variant['status'] ?? '') !== 'approved' || ($variant['slot'] ?? '') !== 'hero') {
        return null;
    }
    if (($variant['segment'] ?? '') !== $campaign || !fm_welcome_valid_uuid($id)) {
        return null;
    }
    $copy = is_array($variant['copy'] ?? null) ? $variant['copy'] : [];
    $href = (string)($copy['cta_href'] ?? '');
    if (!in_array($href, FM_WELCOME_CTA, true)) {
        return null;
    }
    $clean = [
        'eyebrow' => fm_welcome_clean_copy($copy['eyebrow'] ?? '', 80),
        'headline' => fm_welcome_clean_copy($copy['headline'] ?? '', 140),
        'subhead' => fm_welcome_clean_copy($copy['subhead'] ?? '', 320),
        'cta' => fm_welcome_clean_copy($copy['cta'] ?? '', 48),
        'cta_href' => $href,
    ];
    if ($clean['eyebrow'] === '' || $clean['headline'] === '' || $clean['subhead'] === '' || $clean['cta'] === '') {
        return null;
    }
    return [
        'id' => $id,
        'status' => 'approved',
        'slot' => 'hero',
        'segment' => $campaign,
        'copy' => $clean,
    ];
}

function fm_welcome_campaign_from_query(array $query): array
{
    $slug = fm_welcome_slug($query['fm_c'] ?? null);
    if ($slug === '') {
        $slug = fm_welcome_slug($query['rh_c'] ?? null);
    }
    if ($slug === '') {
        $slug = fm_welcome_slug($query['utm_campaign'] ?? null);
    }
    return [
        'utm_source' => fm_welcome_token($query['utm_source'] ?? null),
        'utm_medium' => strtolower(fm_welcome_token($query['utm_medium'] ?? null)),
        'utm_campaign' => fm_welcome_token($query['utm_campaign'] ?? null),
        'utm_content' => fm_welcome_token($query['utm_content'] ?? null),
        'utm_term' => fm_welcome_token($query['utm_term'] ?? null),
        'campaign_key' => $slug,
    ];
}

function fm_welcome_visit_row(string $visitorId, string $page, string $referrerHost, array $campaign): array
{
    return [
        'visitor_id' => strtolower($visitorId),
        'page_path' => $page,
        'referrer_host' => $referrerHost,
        'utm_source' => $campaign['utm_source'],
        'utm_medium' => $campaign['utm_medium'],
        'utm_campaign' => $campaign['utm_campaign'],
        'utm_content' => $campaign['utm_content'],
        'utm_term' => $campaign['utm_term'],
        'campaign_key' => $campaign['campaign_key'],
    ];
}

function fm_welcome_json_result(int $status, array $body, array $extraHeaders = []): array
{
    $headers = array_merge([
        'Content-Type: application/json; charset=utf-8',
        'Cache-Control: no-store',
        'X-Content-Type-Options: nosniff',
        'Referrer-Policy: no-referrer',
    ], $extraHeaders);
    return ['status' => $status, 'headers' => $headers, 'body' => $body];
}

function fm_welcome_disabled_body(): array
{
    return ['ok' => true, 'personalization' => false];
}

function fm_welcome_parse_body(string $raw): ?array
{
    if (strlen($raw) > 2048) {
        return null;
    }
    if (trim($raw) === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function fm_welcome_supabase(array $config, string $method, string $path, ?array $payload, ?callable $transport): array
{
    if ($transport !== null) {
        $result = $transport($method, $path, $payload);
        return is_array($result) ? $result : ['status' => 0, 'body' => null];
    }
    if (!function_exists('curl_init') || $config['supabase_url'] === '' || $config['service_role_key'] === '') {
        return ['status' => 0, 'body' => null];
    }
    $ch = curl_init($config['supabase_url'] . $path);
    if ($ch === false) {
        return ['status' => 0, 'body' => null];
    }
    $headers = [
        'Accept: application/json',
        'Content-Type: application/json',
        'apikey: ' . $config['service_role_key'],
        'Authorization: Bearer ' . $config['service_role_key'],
        'Prefer: return=representation',
    ];
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 2,
        CURLOPT_CONNECTTIMEOUT => 2,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
    ]);
    if ($payload !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_SLASHES));
    }
    $raw = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    if (!is_string($raw) || $raw === '') {
        return ['status' => $status, 'body' => null];
    }
    $decoded = json_decode($raw, true);
    return ['status' => $status, 'body' => $decoded];
}

/** @return array{ok:bool,found?:bool,holdout?:bool} */
function fm_welcome_existing_holdout(array $config, string $visitorId, ?callable $transport): array
{
    $path = '/rest/v1/welcome_visitors?visitor_id=eq.' . rawurlencode(strtolower($visitorId)) . '&select=visitor_id,holdout';
    $result = fm_welcome_supabase($config, 'GET', $path, null, $transport);
    if ($result['status'] !== 200 || !is_array($result['body']) || !array_is_list($result['body'])) {
        return ['ok' => false];
    }
    if ($result['body'] === []) {
        return ['ok' => true, 'found' => false];
    }
    $row = $result['body'][0] ?? null;
    if (!is_array($row) || !array_key_exists('holdout', $row) || !is_bool($row['holdout'])) {
        return ['ok' => false];
    }
    return ['ok' => true, 'found' => true, 'holdout' => $row['holdout']];
}

/**
 * @return array{status:int,headers:array,body:array}
 */
function fm_welcome_handle_visit(array $server, string $rawBody, array $query, array $config, ?callable $transport = null): array
{
    $method = strtoupper((string)($server['REQUEST_METHOD'] ?? 'GET'));
    if ($method !== 'POST') {
        return fm_welcome_json_result(405, ['ok' => false, 'error' => 'Method not allowed'], ['Allow: POST']);
    }
    $secure = fm_welcome_request_is_secure($server);
    $parsed = fm_welcome_parse_body($rawBody);
    if ($parsed === null) {
        return fm_welcome_json_result(400, fm_welcome_disabled_body());
    }
    $optout = ($parsed['optout'] ?? false) === true
        || (string)($server['HTTP_DNT'] ?? '') === '1'
        || (string)($server['HTTP_SEC_GPC'] ?? '') === '1';
    if ($optout) {
        $clear = fm_welcome_cookie_header('', $config['cookie_seconds'], $secure, true);
        return fm_welcome_json_result(200, fm_welcome_disabled_body(), ['Set-Cookie: ' . $clear]);
    }
    if (!$config['enabled']) {
        return fm_welcome_json_result(200, fm_welcome_disabled_body());
    }

    $cookie = (string)($server['HTTP_COOKIE'] ?? '');
    $visitorId = '';
    if (preg_match('/(?:^|;\\s*)' . FM_WELCOME_COOKIE . '=([^;]+)/', $cookie, $match)) {
        $candidate = rawurldecode($match[1]);
        if (fm_welcome_valid_uuid($candidate)) {
            $visitorId = strtolower($candidate);
        }
    }
    $isNew = $visitorId === '';
    if ($isNew) {
        $visitorId = fm_welcome_uuid();
    }

    $existing = fm_welcome_existing_holdout($config, $visitorId, $transport);
    if (!$existing['ok']) {
        return fm_welcome_json_result(200, fm_welcome_disabled_body());
    }
    if (!$existing['found']) {
        $holdout = fm_welcome_holdout($visitorId, (int)$config['holdout_percent']);
        $created = fm_welcome_supabase($config, 'POST', '/rest/v1/welcome_visitors', [
            'visitor_id' => $visitorId,
            'holdout' => $holdout,
        ], $transport);
        if ($created['status'] !== 201 && $created['status'] !== 200) {
            return fm_welcome_json_result(200, fm_welcome_disabled_body());
        }
    } else {
        $holdout = $existing['holdout'];
    }

    $page = fm_welcome_page_path((string)($parsed['page'] ?? '/'));
    $referrer = fm_welcome_referrer_host((string)($parsed['referrer_host'] ?? ''));
    $campaign = fm_welcome_campaign_from_query($query);
    $row = fm_welcome_visit_row($visitorId, $page, $referrer, $campaign);
    fm_welcome_supabase($config, 'POST', '/rest/v1/welcome_visits', $row, $transport);

    $set = fm_welcome_cookie_header($visitorId, (int)$config['cookie_seconds'], $secure, false);
    return fm_welcome_json_result(200, [
        'ok' => true,
        'personalization' => true,
        'profile' => ['holdout' => $holdout],
    ], ['Set-Cookie: ' . $set]);
}

/**
 * @return array{status:int,headers:array,body:array}
 */
function fm_welcome_handle_variants(array $server, array $query, array $config, ?callable $transport = null): array
{
    $method = strtoupper((string)($server['REQUEST_METHOD'] ?? 'GET'));
    if ($method !== 'GET') {
        return fm_welcome_json_result(405, ['ok' => false, 'error' => 'Method not allowed'], ['Allow: GET']);
    }
    $slot = (string)($query['slot'] ?? '');
    $campaign = fm_welcome_slug($query['fm_c'] ?? null);
    if ($campaign === '') {
        $campaign = fm_welcome_slug($query['rh_c'] ?? null);
    }
    if ($slot !== 'hero' || $campaign === '' || !$config['enabled']) {
        return fm_welcome_json_result(200, [
            'ok' => true,
            'personalization' => false,
            'variants' => [],
        ]);
    }
    $path = '/rest/v1/welcome_variants?slot=eq.hero&status=eq.approved&segment=eq.'
        . rawurlencode($campaign)
        . '&select=id,status,slot,segment,copy';
    $result = fm_welcome_supabase($config, 'GET', $path, null, $transport);
    if ($result['status'] !== 200 || !is_array($result['body'])) {
        return fm_welcome_json_result(200, [
            'ok' => true,
            'personalization' => false,
            'variants' => [],
        ]);
    }
    $variants = [];
    foreach ($result['body'] as $row) {
        $clean = fm_welcome_validate_variant($row, $campaign);
        if ($clean !== null) {
            $variants[] = $clean;
        }
    }
    return fm_welcome_json_result(200, [
        'ok' => true,
        'personalization' => true,
        'variants' => $variants,
    ]);
}

function fm_welcome_emit(array $result): void
{
    http_response_code($result['status']);
    foreach ($result['headers'] as $header) {
        header($header, false);
    }
    echo json_encode($result['body'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}
