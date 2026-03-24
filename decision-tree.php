<?php
/**
 * Plugin Name: Decision Tree
 * Description: Decision tree admin editor (React Flow) and front-end step-by-step wizard
 *              for WordPress. Reads ACF Pro fields on by submodule posts and exposes them via a REST endpoint consumed by both UIs.
 * Version:     1.0.0
 * Author:      Tristan
 * Text Domain: decision-tree
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'DT_VERSION', '1.0.0' );
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

function decision_tree_get_field_order() {
    return apply_filters( 'decision_tree_field_order', 'display_order' );
}

function decision_tree_get_field_group_id() {
    $id = get_option( 'decision_tree_field_group_id', '' );
    return is_string( $id ) ? sanitize_text_field( $id ) : '';
}

function decision_tree_set_field_group_id( $field_group_id ) {
    return update_option( 'decision_tree_field_group_id', sanitize_text_field( $field_group_id ) );
}

function decision_tree_get_admin_menu_parent() {
    return apply_filters( 'decision_tree_admin_menu_parent', false );
}

require_once DT_PATH . 'includes/class-rest-api.php';
require_once DT_PATH . 'includes/class-admin-page.php';
require_once DT_PATH . 'includes/class-shortcode.php';
require_once DT_PATH . 'includes/class-viewer-shortcode.php';

new DT_Rest_API();
new DT_Admin_Page();
new DT_Shortcode();
new DT_Viewer_Shortcode();

/**
 * Warn administrators if required ACF fields are missing.
 *
 * This helps prevent silent failures when ACF field slugs change or are missing.
 * Only checks on the Decision Tree editor page and only if a field group is selected.
 */
function dt_check_required_acf_fields() {
    if ( ! is_admin() ) {
        return;
    }

    // Only check on the Decision Tree editor page
    if ( ! isset( $_GET['page'] ) || $_GET['page'] !== 'decision-tree-editor' ) {
        return;
    }

    if ( ! function_exists( 'acf_get_fields' ) ) {
        // ACF is not active; nothing to check.
        return;
    }

    // Only check if a field group has been selected
    $field_group_id = decision_tree_get_field_group_id();
    if ( empty( $field_group_id ) ) {
        return;
    }

    // Get all fields from the selected field group
    $fields = acf_get_fields( $field_group_id );
    if ( ! is_array( $fields ) ) {
        return;
    }

    // Build list of field names in this group
    $field_names = wp_list_pluck( $fields, 'name' );

    $required_fields = [
        'sub_module_parent_module',
        'question_text',
        'decisions',
        'info_callout_text',
        'relevant_legislation',
        'display_order',
    ];

    $missing = array_diff( $required_fields, $field_names );

    if ( empty( $missing ) ) {
        return;
    }

    add_action( 'admin_notices', function() use ( $missing ) {
        $missing_list = esc_html( implode( ', ', $missing ) );
        ?>
        <div class="notice notice-error">
            <p><strong>Decision Tree:</strong> required ACF field(s) missing: <?php echo $missing_list; ?>. Please ensure the selected ACF field group contains these fields.</p>
        </div>
        <?php
    } );
}
add_action( 'admin_init', 'dt_check_required_acf_fields' );
