<?php
declare(strict_types=1);

ini_set('display_errors', '0');
require_once __DIR__ . '/welcome-lib.php';

if (realpath((string)($_SERVER['SCRIPT_FILENAME'] ?? '')) === __FILE__) {
    fm_welcome_emit(fm_welcome_handle_variants($_SERVER, $_GET, fm_welcome_load_config()));
}
