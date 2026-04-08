<?php
/**
 * REST API endpoints for the decision tree plugin.
 *
 * Endpoints:
 *   GET /wp-json/dt/v1/modules          — list of all main module posts (for admin dropdown)
 *   GET /wp-json/dt/v1/tree/{module_id} — nodes + edges for a given module's sub-modules
 *
 * ACF field slugs used (all on the submodules posts):
 *   sub_module_parent_module  relationship → main module
 *   question_text             text         → the yes/no question prompt (added by Rachel)
 *   decisions                 repeater     → decision rows (two per node: Yes and No)
 *     decisions[].decision_text    text          → button label
 *     decisions[].decision_answer  radio Yes|No  → which branch
 *     decisions[].decision_path    relationship  → target post ID (return_format: id)
 *   info_callout_text         text         → best practice callout
 *   display_order             number       → sort order within module
 *   relevant_legislation      repeater     → legislation rows
 *     relevant_legislation[].act               text
 *     relevant_legislation[].section           text
 *     relevant_legislation[].legislation_link  url
 */

if ( ! defined( 'ABSPATH' ) ) exit;

class DT_Rest_API {

    public function __construct() {
        add_action( 'rest_api_init', [ $this, 'register_routes' ] );
    }

    public function register_routes() {
        register_rest_route( 'dt/v1', '/modules', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'get_modules' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ] );

        register_rest_route( 'dt/v1', '/tree/(?P<module_id>\d+)', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'get_tree' ],
            'permission_callback' => '__return_true', // read-only; public tree data
            'args'                => [
                'module_id' => [
                    'validate_callback' => fn( $v ) => is_numeric( $v ) && $v > 0,
                    'sanitize_callback' => 'absint',
                ],
            ],
        ] );

        register_rest_route( 'dt/v1', '/resources', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'get_resources' ],
            'permission_callback' => '__return_true',
            'args' => [
                'module_id' => [
                    'validate_callback' => fn( $v ) => is_numeric( $v ) && $v > 0,
                    'sanitize_callback' => 'absint',
                    'required' => false,
                ],
            ],
        ] );

        register_rest_route( 'dt/v1', '/tree-resource/(?P<resource_id>\d+)', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'get_tree_by_resource' ],
            'permission_callback' => '__return_true',
            'args'                => [
                'resource_id' => [
                    'validate_callback' => fn( $v ) => is_numeric( $v ) && $v > 0,
                    'sanitize_callback' => 'absint',
                ],
            ],
        ] );

        register_rest_route( 'dt/v1', '/node/(?P<post_id>\d+)', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'update_node' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'post_id' => [
                    'validate_callback' => fn( $v ) => is_numeric( $v ) && $v > 0,
                    'sanitize_callback' => 'absint',
                ],
            ],
        ] );

        register_rest_route( 'dt/v1', '/nodes', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'create_node' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ] );

        register_rest_route( 'dt/v1', '/module/(?P<module_id>\d+)', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'set_module_settings' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'module_id' => [
                    'validate_callback' => fn( $v ) => is_numeric( $v ) && $v > 0,
                    'sanitize_callback' => 'absint',
                ],
            ],
        ] );

        register_rest_route( 'dt/v1', '/node/(?P<post_id>\d+)', [
            'methods'             => 'DELETE',
            'callback'            => [ $this, 'delete_node' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'post_id' => [
                    'validate_callback' => fn( $v ) => is_numeric( $v ) && $v > 0,
                    'sanitize_callback' => 'absint',
                ],
            ],
        ] );

        register_rest_route( 'dt/v1', '/field-groups', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'get_field_groups' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ] );

        register_rest_route( 'dt/v1', '/field-group', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'set_field_group' ],
            'permission_callback' => [ $this, 'check_admin_permission' ],
            'args'                => [
                'id' => [
                    'validate_callback' => fn( $v ) => is_string( $v ) && strlen( $v ) > 0,
                    'sanitize_callback' => 'sanitize_text_field',
                    'required'          => true,
                ],
            ],
        ] );
    }

    /**
     * Only logged-in editors can fetch data (admin use only).
     */
    public function check_permission() {
        return current_user_can( 'edit_posts' );
    }

    /**
     * Only site admins can change settings.
     */
    public function check_admin_permission() {
        return current_user_can( 'manage_options' );
    }

    // -------------------------------------------------------------------------
    // GET /wp-json/dt/v1/modules
    // -------------------------------------------------------------------------

    public function get_modules() {
        $modules = get_posts( [
            'post_type'   => decision_tree_get_module_post_type(),
            'post_status' => 'publish',
            'numberposts' => -1,
            'orderby'     => 'title',
            'order'       => 'ASC',
        ] );

        return array_map( fn( $p ) => [
            'id'    => $p->ID,
            'title' => $p->post_title,
        ], $modules );
    }

    // -------------------------------------------------------------------------
    // GET /wp-json/dt/v1/resources
    // -------------------------------------------------------------------------

    public function get_resources( WP_REST_Request $request ) {
        $module_id      = $request->get_param( 'module_id' );
        $field_group_id = $request->get_param( 'field_group_id' );

        $field_group_mode = 'unknown';

        // Detect field group role by schema inspection (see SCHEMA.md)
        if ( $field_group_id ) {
            $field_group_mode = decision_tree_get_field_group_mode( $field_group_id );

            if ( $field_group_mode === 'unknown' ) {
                return new WP_Error(
                    'schema_mismatch',
                    'Selected ACF field group does not match resource or submodule schema. ' .
                        'See SCHEMA.md for required field definitions.',
                    [ 'status' => 400 ],
                );
            }
        }

        // Resource mode: return all module posts that have module_decision_tree enabled.
        // Each such post IS a tree — no further parent filtering is applied because
        // module_parent_subsection links to ct-kb-subsection (not ct-kb-module), so
        // filtering by module_id here would always return zero results.
        if ( $field_group_mode === 'resource' ) {
            $all = get_posts( [
                'post_type'   => decision_tree_get_module_post_type(),
                'post_status' => 'publish',
                'numberposts' => -1,
                'orderby'     => 'title',
                'order'       => 'ASC',
            ] );

            $trees = array_values( array_filter( $all, function( $post ) {
                return (bool) get_field( decision_tree_get_field_resource_decision_tree(), $post->ID );
            } ) );

            return rest_ensure_response( [
                'fieldGroupMode' => 'resource',
                'resources' => array_map( fn( $p ) => [
                    'id'    => $p->ID,
                    'title' => $p->post_title,
                ], $trees ),
            ] );
        }

        // Submodule mode: return empty resources list + message
        if ( $field_group_mode === 'submodule' ) {
            return rest_ensure_response( [
                'fieldGroupMode' => 'submodule',
                'resources' => [],
                'message' => 'This field group is submodule-type. Tree loads directly from module.',
            ] );
        }

        // No field group selected yet
        return rest_ensure_response( [
            'fieldGroupMode' => 'unknown',
            'resources' => [],
        ] );
    }

    // -------------------------------------------------------------------------
    // GET /wp-json/dt/v1/tree-resource/{resource_id}
    // -------------------------------------------------------------------------

    public function get_tree_by_resource( WP_REST_Request $request ) {
        if ( ! function_exists( 'get_field' ) ) {
            return new WP_Error( 'acf_missing', 'ACF Pro is required.', [ 'status' => 500 ] );
        }

        $resource_id = $request->get_param( 'resource_id' );
        $resource = get_post( $resource_id );

        if ( ! $resource || $resource->post_type !== decision_tree_get_module_post_type() ) {
            return new WP_Error( 'resource_not_found', 'Resource not found.', [ 'status' => 404 ] );
        }

        $is_enabled = get_field( decision_tree_get_field_resource_decision_tree(), $resource_id );
        if ( ! $is_enabled ) {
            return new WP_Error( 'resource_not_tree_enabled', 'Resource decision tree is disabled.', [ 'status' => 404 ] );
        }

        $linked_subs = get_field( decision_tree_get_field_resource_linked_submodules(), $resource_id );
        $submodule_ids = [];
        if ( is_array( $linked_subs ) ) {
            foreach ( $linked_subs as $item ) {
                if ( is_object( $item ) && isset( $item->ID ) ) {
                    $submodule_ids[] = $item->ID;
                } elseif ( is_numeric( $item ) ) {
                    $submodule_ids[] = (int) $item;
                }
            }
        }

        if ( empty( $submodule_ids ) ) {
            return new WP_Error( 'no_nodes', 'No sub-modules found for this resource.', [ 'status' => 404 ] );
        }

        $all_sub_modules = get_posts( [
            'post_type'   => decision_tree_get_submodule_post_type(),
            'post_status' => [ 'publish', 'draft', 'pending', 'future', 'private' ],
            'numberposts' => -1,
            'post__in'    => $submodule_ids,
        ] );

        // // Only include steps typed as Decision Tree Step.
        // $all_sub_modules = array_filter( $all_sub_modules, function( $post ) {
        //     return get_field( 'resource_type', $post->ID ) === 'Decision Tree Step';
        // } );

        // if ( empty( $all_sub_modules ) ) {
        //     return new WP_Error( 'no_nodes', 'No sub-modules found for this resource.', [ 'status' => 404 ] );
        // }

        return $this->build_tree_response( $all_sub_modules, $resource_id );
    }

    // helper to avoid duplicating node/edge build
    private function build_tree_response( $sub_modules, $resource_id ) {
        $nodes          = [];
        $edges          = [];
        $all_target_ids = [];

        foreach ( $sub_modules as $post ) {
            $node_id = 'sm-' . $post->ID;
            $decisions = get_field( decision_tree_get_field_decisions(), $post->ID ) ?: [];
            $meta_terminal = get_post_meta( $post->ID, '_dt_is_terminal', true );
            $is_terminal   = ! empty( $decisions ) ? false : ( $meta_terminal === '1' );

            $filled = 0;
            foreach ( $decisions as $row ) {
                $path = $row['decision_path'] ?? [];
                if ( ! empty( $path ) ) {
                    $filled++;
                }
            }

            if ( $is_terminal ) {
                $link_status = 'terminal';
            } elseif ( $filled === count( $decisions ) && count( $decisions ) >= 2 ) {
                $link_status = 'complete';
            } elseif ( $filled > 0 ) {
                $link_status = 'partial';
            } else {
                $link_status = 'empty';
            }

            $legislation = [];
            foreach ( get_field( decision_tree_get_field_legislation(), $post->ID ) ?: [] as $leg ) {
                $legislation[] = [
                    'act'     => $leg['act']              ?? '',
                    'section' => $leg['section']          ?? '',
                    'url'     => $leg['legislation_link'] ?? '',
                ];
            }

            $nodes[] = [
                'id'   => $node_id,
                'data' => [
                    'postId'      => $post->ID,
                    'label'       => $post->post_title,
                    'question'    => get_field( decision_tree_get_field_question_text(), $post->ID ) ?: null,
                    'content'     => apply_filters( 'the_content', $post->post_content ),
                    'rawContent'  => $post->post_content,
                    'callout'     => get_field( decision_tree_get_field_info_callout(), $post->ID ) ?: null,
                    'legislation' => $legislation,
                    'adminNotes'  => get_post_meta( $post->ID, '_dt_admin_notes', true ) ?: '',
                    'isTerminal'  => $is_terminal,
                    'linkStatus'  => $link_status,
                ],
            ];

            foreach ( $decisions as $row ) {
                $path = $row['decision_path'] ?? [];
                $target_post_id = is_array( $path ) ? ( $path[0] ?? null ) : $path;
                if ( ! $target_post_id ) continue;

                $target_node_id   = 'sm-' . $target_post_id;
                $all_target_ids[] = $target_node_id;

                $edges[] = [
                    'id'     => 'e-' . $post->ID . '-' . $target_post_id . '-' . strtolower( $row['decision_answer'] ?? 'x' ),
                    'source' => $node_id,
                    'target' => $target_node_id,
                    'label'  => $row['decision_text'] ?? ( $row['decision_answer'] ?? '' ),
                    'answer' => $row['decision_answer'] ?? '',
                ];
            }
        }

        $node_ids = array_column( $nodes, 'id' );
        $root_candidates = array_values( array_diff( $node_ids, $all_target_ids ) );
        $root_node_id = $root_candidates[0] ?? ( $node_ids[0] ?? null );

        return rest_ensure_response( [
            'rootNodeId' => $root_node_id,
            'nodes'      => array_values( $nodes ),
            'edges'      => array_values( $edges ),
        ] );
    }

    // -------------------------------------------------------------------------
    // GET /wp-json/dt/v1/field-groups
    // -------------------------------------------------------------------------

    public function get_field_groups() {
        if ( ! function_exists( 'acf_get_field_groups' ) ) {
            return new WP_Error( 'acf_missing', 'ACF Pro is required.', [ 'status' => 500 ] );
        }

        // Get all field groups (both local and database-stored)
        $groups = acf_get_field_groups();

        // Filter and format for frontend, including schema mode so the
        // frontend can auto-select without additional round-trips.
        return array_map( fn( $g ) => [
            'id'    => $g['key'] ?? '',
            'title' => $g['title'] ?? '',
            'mode'  => decision_tree_get_field_group_mode( $g['key'] ?? '' ),
        ], $groups );
    }

    // -------------------------------------------------------------------------
    // POST /wp-json/dt/v1/field-group
    // -------------------------------------------------------------------------

    public function set_field_group( WP_REST_Request $request ) {
        $field_group_id = $request->get_param( 'id' );

        decision_tree_set_field_group_id( $field_group_id );

        return [
            'success' => true,
            'fieldGroupId' => decision_tree_get_field_group_id(),
        ];
    }

    // -------------------------------------------------------------------------
    // GET /wp-json/dt/v1/tree/{module_id}
    // -------------------------------------------------------------------------

    public function get_tree( WP_REST_Request $request ) {
        if ( ! function_exists( 'get_field' ) ) {
            return new WP_Error( 'acf_missing', 'ACF Pro is required.', [ 'status' => 500 ] );
        }

        $resource_id = $request->get_param( 'resource_id' );
        if ( $resource_id ) {
            return $this->get_tree_by_resource( $request );
        }

        // Validate that a field group is selected and has required fields
        $field_group_id = decision_tree_get_field_group_id();
        if ( empty( $field_group_id ) ) {
            return [
                'code'    => 'no_field_group',
                'message' => 'No ACF field group selected. Please select one in the editor.',
            ];
        }

        if ( ! function_exists( 'acf_get_fields' ) ) {
            return new WP_Error( 'acf_missing', 'ACF Pro is required.', [ 'status' => 500 ] );
        }

        $fields = acf_get_fields( $field_group_id );
        if ( ! is_array( $fields ) ) {
            return [
                'code'    => 'field_group_invalid',
                'message' => 'Selected field group could not be found or accessed.',
            ];
        }

        $field_names = wp_list_pluck( $fields, 'name' );
        $required_fields = [
            'sub_module_parent_module',
            'question_text',
            'decisions',
            'info_callout_text',
            'relevant_legislation',
        ];

        $missing = array_diff( $required_fields, $field_names );
        if ( ! empty( $missing ) ) {
            return [
                'code'    => 'schema_mismatch',
                'message' => 'Field group "' . acf_get_field_group( $field_group_id )['title'] . '" does not match the required schema. Missing fields: ' . implode( ', ', $missing ) . '.',
            ];
        }

        $module_id = $request->get_param( 'module_id' );

        // Fetch all sub-modules and filter to those belonging to this module.
        // We filter in PHP rather than relying on serialised meta_query patterns,
        // which can be unreliable across ACF versions.
        $all_sub_modules = get_posts( [
            'post_type'   => decision_tree_get_submodule_post_type(),
            // Admin tree view should include drafts etc for editing; module runtime still filters by parent relationship.
            'post_status' => [ 'publish', 'draft', 'pending', 'future', 'private' ],
            'numberposts' => -1,
        ] );

        $sub_modules = array_filter( $all_sub_modules, function( $post ) use ( $module_id ) {
            $parent = get_field( decision_tree_get_field_submodule_parent_module(), $post->ID );
            return $this->relationship_contains_id( $parent, $module_id );
        } );

        if ( empty( $sub_modules ) ) {
            return new WP_Error( 'no_nodes', 'No sub-modules found for this module.', [ 'status' => 404 ] );
        }

        $nodes          = [];
        $edges          = [];
        $all_target_ids = [];

        foreach ( $sub_modules as $post ) {
            $node_id     = 'sm-' . $post->ID;
            $decisions   = get_field( decision_tree_get_field_decisions(), $post->ID ) ?: [];
            // terminal only if explicitly set by user (not auto-detected from empty decisions)
            $meta_terminal = get_post_meta( $post->ID, '_dt_is_terminal', true );
            $is_terminal   = ! empty( $decisions ) ? false : ( $meta_terminal === '1' );

            // Determine link completeness for admin colour coding.
            $filled = 0;
            foreach ( $decisions as $row ) {
                $path = $row['decision_path'] ?? [];
                if ( ! empty( $path ) ) $filled++;
            }

            if ( $is_terminal ) {
                $link_status = 'terminal';
            } elseif ( $filled === count( $decisions ) && count( $decisions ) >= 2 ) {
                $link_status = 'complete';
            } elseif ( $filled > 0 ) {
                $link_status = 'partial';
            } else {
                $link_status = 'empty';
            }

            // Build legislation array (embedded in node data — no second fetch needed).
            $legislation = [];
            foreach ( get_field( decision_tree_get_field_legislation(), $post->ID ) ?: [] as $leg ) {
                $legislation[] = [
                    'act'     => $leg['act']              ?? '',
                    'section' => $leg['section']          ?? '',
                    'url'     => $leg['legislation_link'] ?? '',
                ];
            }

            $nodes[] = [
                'id'   => $node_id,
                'data' => [
                    'postId'      => $post->ID,
                    'label'       => $post->post_title,
                    'question'    => get_field( decision_tree_get_field_question_text(),    $post->ID ) ?: null,
                    'content'     => apply_filters( 'the_content', $post->post_content ),
                    'rawContent'  => $post->post_content,
                    'callout'     => get_field( decision_tree_get_field_info_callout(), $post->ID ) ?: null,
                    'legislation' => $legislation,
                    'adminNotes'  => get_post_meta( $post->ID, '_dt_admin_notes', true ) ?: '',
                    'isTerminal'  => $is_terminal,
                    'linkStatus'  => $link_status,
                ],
            ];

            // Build one edge per decision row.
            foreach ( $decisions as $row ) {
                $path = $row['decision_path'] ?? [];
                // decision_path return_format is "id" so it's an array of post IDs.
                $target_post_id = is_array( $path ) ? ( $path[0] ?? null ) : $path;
                if ( ! $target_post_id ) continue;

                $target_node_id   = 'sm-' . $target_post_id;
                $all_target_ids[] = $target_node_id;

                $edges[] = [
                    'id'     => 'e-' . $post->ID . '-' . $target_post_id . '-' . strtolower( $row['decision_answer'] ?? 'x' ),
                    'source' => $node_id,
                    'target' => $target_node_id,
                    'label'  => $row['decision_text'] ?? ( $row['decision_answer'] ?? '' ),
                    'answer' => $row['decision_answer'] ?? '', // 'Yes' or 'No'
                ];
            }
        }

        // Root node: prefer explicitly set start node, fall back to auto-detection.
        $node_ids        = array_column( $nodes, 'id' );
        $explicit_start  = get_post_meta( $module_id, '_dt_start_node', true );
        if ( $explicit_start && in_array( $explicit_start, $node_ids, true ) ) {
            $root_node_id = $explicit_start;
        } else {
            $root_candidates = array_values( array_diff( $node_ids, $all_target_ids ) );
            $root_node_id    = $root_candidates[0] ?? ( $node_ids[0] ?? null );
        }

        return rest_ensure_response( [
            'rootNodeId' => $root_node_id,
            'nodes'      => array_values( $nodes ),
            'edges'      => array_values( $edges ),
        ] );
    }

    // -------------------------------------------------------------------------
    // POST /wp-json/dt/v1/module/{module_id}  — update module-level settings
    // -------------------------------------------------------------------------

    public function set_module_settings( WP_REST_Request $request ) {
        $module_id = $request->get_param( 'module_id' );
        $body      = $request->get_json_params();

        if ( isset( $body['start_node_id'] ) ) {
            if ( null === $body['start_node_id'] ) {
                delete_post_meta( $module_id, '_dt_start_node' );
            } else {
                $node_id = sanitize_text_field( $body['start_node_id'] );
                update_post_meta( $module_id, '_dt_start_node', $node_id );
            }
        }

        return rest_ensure_response( [ 'updated' => true, 'module_id' => $module_id ] );
    }

    // -------------------------------------------------------------------------
    // POST /wp-json/dt/v1/node/{post_id}
    // -------------------------------------------------------------------------

    public function update_node( WP_REST_Request $request ) {
        if ( ! function_exists( 'update_field' ) ) {
            return new WP_Error( 'acf_missing', 'ACF Pro is required.', [ 'status' => 500 ] );
        }

        $post_id = $request->get_param( 'post_id' );
        $post    = get_post( $post_id );

        if ( ! $post || $post->post_type !== decision_tree_get_submodule_post_type() ) {
            return new WP_Error( 'not_found', 'Sub-module not found.', [ 'status' => 404 ] );
        }

        $body = $request->get_json_params();

        // ── Update post title ────────────────────────────────────────────────
        if ( isset( $body['title'] ) ) {
            wp_update_post( [
                'ID'         => $post_id,
                'post_title' => sanitize_text_field( $body['title'] ),
            ] );
        }

        // ── Update question_text ACF field ───────────────────────────────────
        if ( isset( $body['question_text'] ) ) {
            update_field( 'question_text', wp_kses_post( $body['question_text'] ), $post_id );
        }

        // ── Update best practice callout ─────────────────────────────────────
        if ( array_key_exists( 'callout', $body ) ) {
            update_field( 'info_callout_text', wp_kses_post( $body['callout'] ), $post_id );
        }

        // ── Admin notes (editor-only, never exposed to viewer) ───────────────
        if ( array_key_exists( 'admin_notes', $body ) ) {
            update_post_meta( $post_id, '_dt_admin_notes', wp_kses_post( $body['admin_notes'] ) );
        }

        // ── Mark as terminal / end node ──────────────────────────────────────
        if ( isset( $body['is_terminal'] ) ) {
            update_post_meta( $post_id, '_dt_is_terminal', $body['is_terminal'] ? '1' : '' );
        }

        // ── Update body content (post_content) ───────────────────────────────
        if ( isset( $body['body_content'] ) ) {
            wp_update_post( [
                'ID'           => $post_id,
                'post_content' => wp_kses_post( $body['body_content'] ),
            ] );
        }

        // ── Remove a connection from the decisions repeater ─────────────────
        // Body: { disconnect: { answer: "Yes"|"No" } }
        if ( isset( $body['disconnect'] ) ) {
            $answer    = sanitize_text_field( $body['disconnect']['answer'] ?? '' );
            $decisions = get_field( 'decisions', $post_id ) ?: [];
            $decisions = array_values( array_filter( $decisions, fn( $r ) => ( $r['decision_answer'] ?? '' ) !== $answer ) );
            update_field( 'decisions', $decisions, $post_id );
        }

        // ── Update a decision button label (decision_text) ───────────────────
        // Body: { decision_label: { answer: "Yes"|"No", text: "New label" } }
        if ( isset( $body['decision_label'] ) ) {
            $answer     = sanitize_text_field( $body['decision_label']['answer'] ?? '' );
            $label_text = sanitize_textarea_field( $body['decision_label']['text']   ?? '' );
            $decisions  = get_field( 'decisions', $post_id ) ?: [];

            foreach ( $decisions as &$row ) {
                if ( ( $row['decision_answer'] ?? '' ) === $answer ) {
                    $row['decision_text'] = $label_text;
                    break;
                }
            }
            unset( $row );
            update_field( 'decisions', $decisions, $post_id );
        }

        // ── Replace the legislation repeater ─────────────────────────────────
        // Body: { legislation: [{ act, section, url }, ...] }
        if ( isset( $body['legislation'] ) ) {
            $rows = [];
            foreach ( (array) $body['legislation'] as $entry ) {
                $rows[] = [
                    'act'              => sanitize_text_field( $entry['act']     ?? '' ),
                    'section'          => sanitize_text_field( $entry['section'] ?? '' ),
                    'legislation_link' => esc_url_raw(        $entry['url']     ?? '' ),
                ];
            }
            update_field( 'relevant_legislation', $rows, $post_id );
        }

        // ── Create or update a connection (decision_path) ────────────────────
        // Body: { connect: { answer: "Yes"|"No", target_id: 123 } }
        if ( isset( $body['connect'] ) ) {
            $answer    = sanitize_text_field( $body['connect']['answer']    ?? '' );
            $target_id = absint( $body['connect']['target_id'] ?? 0 );

            if ( $target_id && in_array( $answer, [ 'Yes', 'No' ], true ) ) {
                $decisions = get_field( 'decisions', $post_id ) ?: [];
                $found     = false;

                foreach ( $decisions as &$row ) {
                    if ( ( $row['decision_answer'] ?? '' ) === $answer ) {
                        $row['decision_path'] = [ $target_id ];
                        $found = true;
                        break;
                    }
                }
                unset( $row );

                if ( ! $found ) {
                    // Add a new decision row if one doesn't exist for this answer yet
                    $decisions[] = [
                        'decision_answer' => $answer,
                        'decision_text'   => $answer,
                        'decision_path'   => [ $target_id ],
                    ];
                }

                update_field( 'decisions', $decisions, $post_id );
            }
        }

        return rest_ensure_response( [ 'updated' => true, 'post_id' => $post_id ] );
    }

    // -------------------------------------------------------------------------
    // POST /wp-json/dt/v1/nodes  — create a new sub-module
    // -------------------------------------------------------------------------

    public function create_node( WP_REST_Request $request ) {
        $body        = $request->get_json_params();
        $title       = sanitize_text_field( $body['title']     ?? 'New Step' );
        $module_id   = absint(             $body['module_id'] ?? 0 );
        $resource_id = absint(             $body['resource_id'] ?? 0 );

        if ( ! $module_id && ! $resource_id ) {
            return new WP_Error( 'missing_parent', 'module_id or resource_id is required.', [ 'status' => 400 ] );
        }

        $post_id = wp_insert_post( [
            'post_type'   => decision_tree_get_submodule_post_type(),
            'post_status' => 'publish',
            'post_title'  => $title,
        ], true );

        if ( is_wp_error( $post_id ) ) {
            return $post_id;
        }

        if ( function_exists( 'update_field' ) ) {
            // Mark the new post as a Decision Tree Step so it's included in tree queries.
            update_field( 'resource_type', 'Decision Tree Step', $post_id );

            if ( $resource_id ) {
                $linked = get_field( decision_tree_get_field_resource_linked_submodules(), $resource_id ) ?: [];
                // store ID list
                $linked_ids = array_map( fn( $item ) => is_object( $item ) ? $item->ID : (int) $item, (array) $linked );
                $linked_ids[] = $post_id;
                update_field( decision_tree_get_field_resource_linked_submodules(), $linked_ids, $resource_id );

                // Also keep backward-compatible module parental linkage where possible
                if ( $module_id ) {
                    update_field( decision_tree_get_field_submodule_parent_module(), [ $module_id ], $post_id );
                }
            } elseif ( $module_id ) {
                update_field( decision_tree_get_field_submodule_parent_module(), [ $module_id ], $post_id );
            }
        }

        return rest_ensure_response( [
            'id'   => 'sm-' . $post_id,
            'data' => [
                'postId'      => $post_id,
                'label'       => $title,
                'question'    => null,
                'content'     => '',
                'rawContent'  => '',
                'callout'     => null,
                'legislation' => [],
                'adminNotes'  => '',
                'isTerminal'  => false,
                'linkStatus'  => 'empty',
            ],
        ] );
    }

    // -------------------------------------------------------------------------
    // DELETE /wp-json/dt/v1/node/{post_id}
    // -------------------------------------------------------------------------

    public function delete_node( WP_REST_Request $request ) {
        $post_id = $request->get_param( 'post_id' );
        $post    = get_post( $post_id );

        if ( ! $post || $post->post_type !== decision_tree_get_submodule_post_type() ) {
            return new WP_Error( 'not_found', 'Sub-module not found.', [ 'status' => 404 ] );
        }

        $result = wp_trash_post( $post_id );
        if ( ! $result ) {
            return new WP_Error( 'delete_failed', 'Could not trash post.', [ 'status' => 500 ] );
        }

        return rest_ensure_response( [ 'success' => true, 'id' => $post_id ] );
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Check whether an ACF relationship field value contains a given post ID.
     * Handles the three formats ACF can return: object, array of objects/IDs, or scalar ID.
     */
    private function relationship_contains_id( $field_value, $target_id ) {
        if ( empty( $field_value ) ) return false;

        $target_id = (int) $target_id;

        if ( is_object( $field_value ) ) {
            return (int) $field_value->ID === $target_id;
        }

        if ( is_array( $field_value ) ) {
            foreach ( $field_value as $item ) {
                $id = is_object( $item ) ? (int) $item->ID : (int) $item;
                if ( $id === $target_id ) return true;
            }
        }

        return (int) $field_value === $target_id;
    }
}
