<?php
/**
 * Registers the Decision Tree admin page under the Knowledge Base Module CPT menu.
 *
 * Navigate to: WP Admin → Knowledge Base Module → Tree Editor
 *
 * The React app (admin/dist/admin.js) mounts into #decision-tree-admin.
 * Module selection and tree rendering happen entirely in the React layer via
 * the /wp-json/dt/v1/modules and /wp-json/dt/v1/tree/{id} endpoints.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class DT_Admin_Page {

    public function __construct() {
        add_action( 'admin_menu',            [ $this, 'register_admin_page' ] );
        add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin_assets' ] );
    }

    public function register_admin_page() {
        $parent = decision_tree_get_admin_menu_parent();

        if ( $parent ) {
            add_submenu_page(
                $parent,
                'Decision Tree',
                'Decision Tree Editor',
                'edit_posts',
                'decision-tree-editor',
                [ $this, 'render_admin_page' ]
            );
        } else {
            add_menu_page(
                'Decision Tree',
                'Decision Tree',
                'edit_posts',
                'decision-tree-editor',
                [ $this, 'render_admin_page' ],
                'dashicons-networking',
                58
            );
        }
    }

    public function render_admin_page() {
        // The React app reads data-module-id from URL param if passed.
        $module_id = isset( $_GET['module_id'] ) ? absint( $_GET['module_id'] ) : 0;
        echo '<div id="decision-tree-admin" data-module-id="' . esc_attr( $module_id ) . '"></div>';
    }



    public function enqueue_admin_assets() {
        // Only load on the editor page.
        if ( ! isset( $_GET['page'] ) || $_GET['page'] !== 'decision-tree-editor' ) return;

        $dist = DT_URL . 'admin/dist/';

        // Enqueue standalone admin bundle (includes React + ReactFlow)
        wp_enqueue_script(
            'decision-tree-admin',
            $dist . 'admin.js',
            [],
            DT_VERSION,
            true
        );

        wp_enqueue_style(
            'decision-tree-admin',
            $dist . 'admin-decision-tree-admin.css',
            [],
            DT_VERSION
        );

        // Remove WP's default .wrap top margin/padding so the editor sits flush
        // under the toolbar. Height is set directly in the React component via
        // calc(100vh - 50px) — no inheritance chain needed.
        wp_add_inline_style( 'decision-tree-admin', '
            #wpbody-content > .wrap { margin-top: 0; padding-top: 0; }
        ' );

        // Make WP config available to the React app via window.dt.
        wp_localize_script( 'decision-tree-admin', 'dt', [
            'restUrl'         => rest_url( 'dt/v1/' ),
            'nonce'           => wp_create_nonce( 'wp_rest' ),
            'editPostUrl'     => admin_url( 'post.php' ),
            'subModulesUrl'   => admin_url( 'edit.php?post_type=' . decision_tree_get_submodule_post_type() ),
        ] );
    }
}
