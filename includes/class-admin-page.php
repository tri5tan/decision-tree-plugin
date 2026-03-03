<?php
/**
 * Registers the Decision Tree admin page under the Knowledge Base Module CPT menu.
 *
 * Navigate to: WP Admin → Knowledge Base Module → Tree Editor
 *
 * The React app (admin/dist/admin.js) mounts into #ct-decision-tree-admin.
 * Module selection and tree rendering happen entirely in the React layer via
 * the /wp-json/ct/v1/modules and /wp-json/ct/v1/tree/{id} endpoints.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class CT_DT_Admin_Page {

    public function __construct() {
        add_action( 'admin_menu',            [ $this, 'register_admin_page' ] );
        add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin_assets' ] );
    }

    public function register_admin_page() {
        add_submenu_page(
            'edit.php?post_type=ct-kb-module', // parent: the Module CPT list table
            'Decision Tree Editor',              // page title
            'Tree Editor',                       // menu label
            'edit_posts',                      // capability
            'ct-decision-tree',                // slug — used to identify the page
            [ $this, 'render_admin_page' ]
        );
    }

    public function render_admin_page() {
        // The React app reads data-module-id to pre-select a module if passed via URL.
        $module_id = isset( $_GET['module_id'] ) ? absint( $_GET['module_id'] ) : 0;
        echo '<div id="ct-decision-tree-admin" data-module-id="' . esc_attr( $module_id ) . '"></div>';
    }

    public function enqueue_admin_assets() {
        // Only load on our admin page.
        if ( ! isset( $_GET['page'] ) || $_GET['page'] !== 'ct-decision-tree' ) return;

        $dist = CT_DT_URL . 'admin/dist/';

        // Enqueue standalone admin bundle (includes React + ReactFlow)
        wp_enqueue_script(
            'ct-decision-tree-admin',
            $dist . 'admin.js',
            [],
            CT_DT_VERSION,
            true
        );

        wp_enqueue_style(
            'ct-decision-tree-admin',
            $dist . 'admin-ct-decision-tree-admin.css',
            [],
            CT_DT_VERSION
        );

        // Make WP config available to the React app via window.ctDT.
        wp_localize_script( 'ct-decision-tree-admin', 'ctDT', [
            'restUrl'       => rest_url( 'ct/v1/' ),
            'nonce'         => wp_create_nonce( 'wp_rest' ),
            'editPostUrl'   => admin_url( 'post.php' ),
            'subModulesUrl' => admin_url( 'edit.php?post_type=ct-kb-submodules' ),
        ] );
    }
}
