<?php
/**
 * Plugin Name: CT Decision Tree
 * Description: Decision tree admin editor (React Flow) and front-end step-by-step wizard
 *              for the Council Toolkit knowledge base. Reads ACF Pro fields on ct-kb-submodules
 *              posts and exposes them via a REST endpoint consumed by both UIs.
 * Version:     1.0.0
 * Author:      Tristan
 * Text Domain: ct-decision-tree
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'CT_DT_VERSION', '1.0.0' );
define( 'CT_DT_PATH',    plugin_dir_path( __FILE__ ) );
define( 'CT_DT_URL',     plugin_dir_url( __FILE__ ) );

require_once CT_DT_PATH . 'includes/class-rest-api.php';
require_once CT_DT_PATH . 'includes/class-admin-page.php';
require_once CT_DT_PATH . 'includes/class-shortcode.php';
require_once CT_DT_PATH . 'includes/class-viewer-shortcode.php';

new CT_DT_Rest_API();
new CT_DT_Admin_Page();
new CT_DT_Shortcode();
new CT_DT_Viewer_Shortcode();
