<?php
/**
 * Registers the [ct_decision_tree] shortcode.
 *
 * Usage (in Bricks Builder Code/Shortcode widget, or any page/post content):
 *   [ct_decision_tree module_id="123"]
 *
 * Where 123 is the post ID of the ct-kb-module whose sub-module tree you want to render.
 *
 * Output: a <div class="ct-wizard"> that wizard.js mounts into.
 * Styling: public/wizard.css provides base styles. Override freely with custom CSS in Bricks.
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class CT_DT_Shortcode {

    public function __construct() {
        add_shortcode( 'ct_decision_tree', [ $this, 'render_shortcode' ] );
        // Enqueue wizard assets early (not inside the shortcode callback) so Bricks Builder
        // doesn't miss the enqueue once its rendering pipeline has already past <head>/footer.
        add_action( 'wp_enqueue_scripts', [ $this, 'register_wizard_assets' ] );
    }

    public function render_shortcode( $atts ) {
        $atts = shortcode_atts( [ 'module_id' => 0 ], $atts, 'ct_decision_tree' );
        $module_id = absint( $atts['module_id'] );

        if ( ! $module_id ) {
            return '<!-- ct_decision_tree: module_id attribute is required -->';
        }

        return sprintf(
            '<div class="ct-wizard" data-module-id="%d"></div>',
            $module_id
        );
    }

    public function register_wizard_assets() {
        wp_enqueue_script(
            'ct-decision-tree-wizard',
            CT_DT_URL . 'public/wizard.js',
            [],
            CT_DT_VERSION,
            true // load in footer
        );

        wp_localize_script( 'ct-decision-tree-wizard', 'ctDTWizard', [
            'restUrl' => rest_url( 'ct/v1/' ),
        ] );

        wp_enqueue_style(
            'ct-decision-tree-wizard',
            CT_DT_URL . 'public/wizard.css',
            [],
            CT_DT_VERSION
        );
    }
}
