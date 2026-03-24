<?php
/**
 * Registers the [decision_tree] shortcode.
 *
 * Usage (in Bricks Builder Code/Shortcode widget, or any page/post content):
 *   [decision_tree module_id="123"]
 *
 * Where 123 is the post ID of the main module whose sub-module tree you want to render.
 *
 * Output: a <div class="dt-wizard"> that wizard.js mounts into.
 * Styling: public/wizard.css provides base styles. Override freely with custom CSS in Bricks.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class DT_Shortcode {

    public function __construct() {
        add_shortcode( 'decision_tree', [ $this, 'render_shortcode' ] );
        // Enqueue wizard assets early (not inside the shortcode callback) so Bricks Builder
        // doesn't miss the enqueue once its rendering pipeline has already past <head>/footer.
        add_action( 'wp_enqueue_scripts', [ $this, 'register_wizard_assets' ] );
    }

    public function render_shortcode( $atts ) {
        $atts = shortcode_atts( [ 'module_id' => 0 ], $atts, 'decision_tree' );
        $module_id = absint( $atts['module_id'] );

        if ( ! $module_id ) {
            $module_id = decision_tree_get_default_module_id();
        }

        if ( ! $module_id ) {
            return '<p><strong>Decision Tree:</strong> module_id not set. Please configure a default module in Decision Tree settings or pass module_id in the shortcode.</p>';
        }

        return sprintf(
            '<div class="dt-wizard" data-module-id="%d"></div>',
            $module_id
        );
    }

    public function register_wizard_assets() {
        wp_enqueue_script(
            'decision-tree-wizard',
            DT_URL . 'public/wizard.js',
            [],
            DT_VERSION,
            true // load in footer
        );

        wp_localize_script( 'decision-tree-wizard', 'dtWizard', [
            'restUrl' => rest_url( 'dt/v1/' ),
        ] );

        wp_enqueue_style(
            'decision-tree-wizard',
            DT_URL . 'public/wizard.css',
            [],
            DT_VERSION
        );
    }
}
