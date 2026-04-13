<?php
/**
 * Plugin Name: Decision Tree
 * Description: Decision tree admin editor (React Flow) and front-end step-by-step wizard
 *              for WordPress. Reads ACF Pro fields on by submodule posts and exposes them via a REST endpoint consumed by both UIs.
 * Version:     1.0.7
 * Author:      Tristan
 * Text Domain: decision-tree
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'DT_VERSION', '1.0.7' );
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

function decision_tree_get_field_group_id() {
    $id = get_option( 'decision_tree_field_group_id', '' );
    return is_string( $id ) ? sanitize_text_field( $id ) : '';
}

function decision_tree_set_field_group_id( $field_group_id ) {
    return update_option( 'decision_tree_field_group_id', sanitize_text_field( $field_group_id ) );
}

/**
 * Detect field group role by schema inspection.
 * 
 * Not based on post type name or field group title — only the required field names.
 * See SCHEMA.md for canonical field definitions.
 * 
 * @param string $field_group_id ACF field group key
 * @return string 'resource', 'submodule', or 'unknown'
 */
function decision_tree_get_field_group_mode( $field_group_id ) {
    if ( ! function_exists( 'acf_get_fields' ) ) {
        return 'unknown';
    }

    $fields = acf_get_fields( $field_group_id );
    if ( ! is_array( $fields ) || empty( $fields ) ) {
        return 'unknown';
    }

    $field_names = wp_list_pluck( $fields, 'name' );

    // Resource schema: must have module_decision_tree + module_linked_sub_modules
    $resource_required = [
        decision_tree_get_field_resource_decision_tree(),
        decision_tree_get_field_resource_linked_submodules(),
    ];
    $resource_missing = array_diff( $resource_required, $field_names );
    if ( empty( $resource_missing ) ) {
        return 'resource';
    }

    // Submodule schema: must have all step fields
    $submodule_required = [
        decision_tree_get_field_submodule_parent_module(),
        decision_tree_get_field_question_text(),
        decision_tree_get_field_decisions(),
        decision_tree_get_field_info_callout(),
        decision_tree_get_field_legislation(),
    ];
    $submodule_missing = array_diff( $submodule_required, $field_names );
    if ( empty( $submodule_missing ) ) {
        return 'submodule';
    }

    return 'unknown';
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

    // Use schema detection rather than a hardcoded field list.
    // Warn only if the saved group matches neither the resource nor the submodule schema.
    $mode = decision_tree_get_field_group_mode( $field_group_id );

    if ( $mode !== 'unknown' ) {
        return; // schema recognised — nothing to warn about
    }

    add_action( 'admin_notices', function() use ( $field_group_id ) {
        $group = function_exists( 'acf_get_field_group' ) ? acf_get_field_group( $field_group_id ) : [];
        $title = $group['title'] ?? $field_group_id;
        ?>
        <div class="notice notice-error">
            <p><strong>Decision Tree:</strong> The selected ACF field group ("<?php echo esc_html( $title ); ?>") does not match the required schema. It should contain either the resource fields (<code>module_decision_tree</code>, <code>module_linked_sub_modules</code>) or the submodule step fields (<code>resource_type</code>, <code>question_text</code>, etc.). See SCHEMA.md for details.</p>
        </div>
        <?php
    } );
}
add_action( 'admin_init', 'dt_check_required_acf_fields' );
