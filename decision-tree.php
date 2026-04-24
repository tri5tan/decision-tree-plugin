<?php
/**
 * Plugin Name: Decision Tree
 * Description: Decision tree admin editor (React Flow) and front-end step-by-step wizard
 *              for WordPress. Reads ACF Pro fields on by submodule posts and exposes them via a REST endpoint consumed by both UIs.
 * Version:     1.1.3
 * Author:      Tristan
 * Text Domain: decision-tree
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'DT_VERSION', '1.1.3' );
define( 'DT_PATH',    plugin_dir_path( __FILE__ ) );
define( 'DT_URL',     plugin_dir_url( __FILE__ ) );

/**
 * Core configuration abstractions.
 * Allows site overrides without hardcoded slug changes.
 */
function decision_tree_get_module_post_type() {
    return apply_filters( 'decision_tree_module_post_type', 'ct-kb-module' );
}

function decision_tree_get_submodule_post_type() {
    return apply_filters( 'decision_tree_submodule_post_type', 'ct-kb-submodules' );
}

function decision_tree_get_field_submodule_parent_module() {
    return apply_filters( 'decision_tree_field_submodule_parent_module', 'sub_module_parent_module' );
}

function decision_tree_get_field_question_text() {
    return apply_filters( 'decision_tree_field_question_text', 'question_text' );
}

function decision_tree_get_field_decisions() {
    return apply_filters( 'decision_tree_field_decisions', 'decisions' );
}

function decision_tree_get_field_info_callout() {
    return apply_filters( 'decision_tree_field_info_callout', 'info_callout_text' );
}

function decision_tree_get_field_legislation() {
    return apply_filters( 'decision_tree_field_legislation', 'relevant_legislation' );
}

function decision_tree_get_field_resource_type() {
    return apply_filters( 'decision_tree_field_resource_type', 'resource_type' );
}

function decision_tree_get_field_resource_decision_tree() {
    return apply_filters( 'decision_tree_field_resource_decision_tree', 'module_decision_tree' );
}

function decision_tree_get_field_resource_linked_submodules() {
    return apply_filters( 'decision_tree_field_resource_linked_submodules', 'module_linked_sub_modules' );
}

function decision_tree_get_field_module_parent_subsection() {
    return apply_filters( 'decision_tree_field_module_parent_subsection', 'module_parent_subsection' );
}

function decision_tree_get_topic_post_type() {
    return apply_filters( 'decision_tree_topic_post_type', 'ct-kb-subsection' );
}

function decision_tree_get_admin_menu_parent() {
    return apply_filters( 'decision_tree_admin_menu_parent', false );
}

// Register under Knowledge Base Module by default
add_filter( 'decision_tree_admin_menu_parent', function() {
    return 'edit.php?post_type=ct-kb-module';
} );

require_once DT_PATH . 'includes/class-rest-api.php';
require_once DT_PATH . 'includes/class-admin-page.php';
require_once DT_PATH . 'includes/class-shortcode.php';
require_once DT_PATH . 'includes/class-viewer-shortcode.php';

new DT_Rest_API();
new DT_Admin_Page();
new DT_Shortcode();
new DT_Viewer_Shortcode();


