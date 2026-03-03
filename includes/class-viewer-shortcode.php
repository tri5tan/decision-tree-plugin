<?php
/**
 * Registers the [ct_tree_viewer] shortcode.
 *
 * Usage (in Bricks Builder Code/Shortcode widget, or any page/post content):
 *   [ct_tree_viewer module_id="123"]
 *
 * Where 123 is the post ID of the ct-kb-module whose decision tree you want to visualize.
 *
 * Output: a <div id="ct-decision-tree-viewer"> that viewer-entry.jsx mounts into.
 * This renders a read-only, interactive React Flow graph showing the full decision tree
 * with all content visible on each node. Users can zoom and pan to explore the tree.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class CT_DT_Viewer_Shortcode {

    public function __construct() {
        add_shortcode( 'ct_tree_viewer', [ $this, 'render_shortcode' ] );
        add_action( 'wp_enqueue_scripts', [ $this, 'register_viewer_assets' ] );
    }

    public function render_shortcode( $atts ) {
        $atts = shortcode_atts( [ 'module_id' => 0 ], $atts, 'ct_tree_viewer' );
        $module_id = absint( $atts['module_id'] );

        if ( ! $module_id ) {
            return '<!-- ct_tree_viewer: module_id attribute is required -->';
        }

        return sprintf(
            '<div id="ct-decision-tree-viewer" data-module-id="%d" style="height: inherit;"></div>',
            $module_id
        );
    }

    public function register_viewer_assets() {
        $dist = CT_DT_URL . 'admin/dist/';

        // Enqueue standalone viewer bundle (includes React + ReactFlow)
        wp_enqueue_script(
            'ct-decision-tree-viewer',
            $dist . 'viewer.js',
            [],
            CT_DT_VERSION,
            true
        );

        wp_localize_script( 'ct-decision-tree-viewer', 'ctDTViewer', [
            'restUrl' => rest_url( 'ct/v1/' ),
        ] );

        wp_enqueue_style(
            'ct-decision-tree-viewer',
            $dist . 'viewer-ct-decision-tree-admin.css',
            [],
            CT_DT_VERSION
        );
    }
}
