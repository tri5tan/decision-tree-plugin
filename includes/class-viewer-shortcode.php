<?php
/**
 * Registers the [tree_viewer] shortcode.
 *
 * Usage (in Bricks Builder Code/Shortcode widget, or any page/post content):
 *   [tree_viewer module_id="123"]
 *
 * Where 123 is the post ID of the main module whose decision tree you want to visualize.
 *
 * Output: a <div id="decision-tree-viewer"> that viewer-entry.jsx mounts into.
 * This renders a read-only, interactive React Flow graph showing the full decision tree
 * with all content visible on each node. Users can zoom and pan to explore the tree.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class DT_Viewer_Shortcode {

    public function __construct() {
        add_shortcode( 'tree_viewer', [ $this, 'render_shortcode' ] );
        add_action( 'wp_enqueue_scripts', [ $this, 'register_viewer_assets' ] );
    }

    public function render_shortcode( $atts ) {
        $atts = shortcode_atts( [ 'module_id' => 0 ], $atts, 'tree_viewer' );
        $module_id = absint( $atts['module_id'] );

        if ( ! $module_id ) {
            $module_id = decision_tree_get_default_module_id();
        }

        if ( ! $module_id ) {
            return '<p><strong>Tree Viewer:</strong> module_id not set. Please configure a default module in Decision Tree settings or pass module_id in the shortcode.</p>';
        }

        return sprintf(
            '<div id="decision-tree-viewer" data-module-id="%d" style="height: inherit;"></div>',
            $module_id
        );
    }

    public function register_viewer_assets() {
        $dist = DT_URL . 'admin/dist/';

        // Enqueue standalone viewer bundle (includes React + ReactFlow)
        wp_enqueue_script(
            'decision-tree-viewer',
            $dist . 'viewer.js',
            [],
            DT_VERSION,
            true
        );

        wp_localize_script( 'decision-tree-viewer', 'dtViewer', [
            'restUrl' => rest_url( 'dt/v1/' ),
        ] );

        wp_enqueue_style(
            'decision-tree-viewer',
            $dist . 'viewer-decision-tree-admin.css',
            [],
            DT_VERSION
        );
    }
}
