<?php
/**
 * Copy this file OUTSIDE the Hostinger document root and point
 * FM_WELCOME_CONFIG at that absolute path. Do not commit the copy.
 * Do not put a service-role key in this repository.
 *
 * Leave enabled false until a Freedom Supabase project exists AND a person
 * has approved the variant copy. Enabled false means no cookie and no writes.
 */
return [
    'supabase_url' => 'https://YOUR-PROJECT.supabase.co',
    'service_role_key' => 'YOUR-SERVICE-ROLE-KEY',
    'enabled' => false,
    'holdout_percent' => 10,
    'cookie_days' => 30,
];
