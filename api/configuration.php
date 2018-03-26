<?php

use Directus\Bootstrap;

/**
 * High priority use case, not super planned out yet.
 * This will be useful in the future as we do a better job organizing our application configuration.
 * We need to distinguish between configuration and application constants.
 */

return [
    'session' => [
        'prefix' => 'directus6_'
    ],

    'default_language' => 'en',

    'filesystem' => [
        'adapter' => 'local',
        // By default media directory are located at the same level of directus root
        // To make them a level up outsite the root directory
        // use this instead
        // Ex: 'root' => realpath(BASE_PATH.'/../storage/uploads'),
        // Note: BASE_PATH constant doesn't end with trailing slash
        'root' => BASE_PATH . '/storage/uploads',
        // This is the url where all the media will be pointing to
        // here all assets will be (yourdomain)/storage/uploads
        // same with thumbnails (yourdomain)/storage/uploads/thumbs
        'root_url' => '/directus/storage/uploads',
        'root_thumb_url' => '/directus/storage/uploads/thumbs',
        'root_ratios_url' => '/directus/storage/uploads/ratios'
        //  'key'    => 's3-key',
        //  'secret' => 's3-key',
        //  'region' => 's3-region',
        //  'version' => 's3-version',
        //  'bucket' => 's3-bucket',
        //  // Digital Ocean endpoint
        //  'endpoint' => ''
        //  'visibility' => 'public'
    ],

    'http' => [
        'emulate_enabled' => false,
        // can be null, or an array list of method to be emulated
        // Ex: ['PATH', 'DELETE', 'PUT']
        // 'emulate_methods' => null,
        'force_https' => false,
        'isHttpsFn' => function () {
            // Override this check for custom arrangements, e.g. SSL-termination @ load balancer
            return isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] != 'off';
        }
    ],

    'mail' => [
        'from' => [
            'directus@localhost' => 'Directus'
        ],
        'transport' => 'mail'
    ],

    'cors' => [
        'enabled' => false,
        'origin' => '*', // can be a comma separated value or array of hosts
        'headers' => [
            'Access-Control-Allow-Headers' => 'Authorization, Content-Type, Access-Control-Allow-Origin',
            'Access-Control-Allow-Credentials' => 'false'
        ]
    ],

    'hooks' => [
        'postInsert' => function ($TableGateway, $record, $db) {

        },
        'postUpdate' => function ($TableGateway, $record, $db) {
            $tableName = $TableGateway->getTable();
            switch ($tableName) {
                // ...
            }
        }
    ],

    'filters' => [
        // 'table.insert.products:before' => \Directus\Customs\Hooks\BeforeInsertProducts::class
        'table.select' => function( \Directus\Hook\Payload $payload ) {
            if (\Directus\Util\StringUtils::endsWith($payload->attribute('tableName'), 'files')) {
                // Get Payload data
                $additional = $payload->getData();
                
                // Get root_ratios_url
                $config = Bootstrap::get('config');
                $fs = $config['filesystem'];
                $base_ratio_path = $fs['root'].'/ratios';
                
                // Array with all ratios to check
                $r = ['sixteen_nine', 'four_three', 'three_two', 'one_one', 'free'];

                for($i = 0; $i < count($additional); $i++) {
                    
                    $name = $additional[$i]['name'];
                    for($j = 0; $j < count($r); $j++) {
                        
                        $file = glob( $base_ratio_path.'/'.$r[ $j ].'/'.substr($name, 0, -4).'*' );
                        foreach( $file as $filefound ) {
                            $additional[ $i ][ $r[ $j ].'_url' ] = str_replace( '/var/www/html', '', $filefound );
                        }
                        
                    }
                        
                }
                
                // Update Payload
                $payload->replace($additional);
            }
            return $payload;
        }
    ],

    'feedback' => [
        'token' => 'afc2a1076ded72acd49b469f571aaebfdf019cf8',
        'login' => true
    ],

    // These tables will not be loaded in the directus schema
    'tableBlacklist' => [],

    'statusMapping' => [
        0 => [
            'name' => 'Deleted',
            'text_color' => '#FFFFFF',
            'background_color' => '#F44336',
            'subdued_in_listing' => true,
            'show_listing_badge' => true,
            'hidden_globally' => true,
            'hard_delete' => false,
            'published' => false,
            'sort' => 0,
            'read_only' => false
        ],
        1 => [
            'name' => 'Published',
            'text_color' => '#FFFFFF',
            'background_color' => '#3498DB',
            'subdued_in_listing' => false,
            'show_listing_badge' => false,
            'hidden_globally' => false,
            'hard_delete' => false,
            'published' => true,
            'sort' => 1,
            'read_only' => false
        ],
        2 => [
            'name' => 'Draft',
            'text_color' => '#999999',
            'background_color' => '#EEEEEE',
            'subdued_in_listing' => true,
            'show_listing_badge' => true,
            'hidden_globally' => false,
            'hard_delete' => false,
            'published' => false,
            'sort' => 2,
            'read_only' => false
        ],
        3 => [
            'name' => 'Archived',
            'text_color' => '#999999',
            'background_color' => '#c1e5b7',
            'subdued_in_listing' => true,
            'show_listing_badge' => true,
            'hidden_globally' => false,
            'hard_delete' => false,
            'published' => false,
            'sort' => 3,
            'read_only' => true
        ],
        4 => [
            'name' => 'Disabled',
            'text_color' => '#999999',
            'background_color' => '#e0bcbc',
            'subdued_in_listing' => true,
            'show_listing_badge' => true,
            'hidden_globally' => false,
            'hard_delete' => false,
            'published' => false,
            'sort' => 4,
            'read_only' => true
        ]
    ],

    'thumbnailer' => [
        '404imageLocation' => __DIR__ . '/../thumbnail/img-not-found.png',
        'supportedThumbnailDimensions' => [
            // width x height
            // '100x100',
            // '300x200',
            // '100x200',
        ],
        'supportedQualityTags' => [
            'poor' => 25,
            'good' => 50,
            'better' => 75,
            'best' => 100,
        ],
        'supportedActions' => [
            'contain' => [
                'options' => [
                    'resizeCanvas' => false, // http://image.intervention.io/api/resizeCanvas
                    'position' => 'center',
                    'resizeRelative' => false,
                    'canvasBackground' => 'ccc', // http://image.intervention.io/getting_started/formats
                 ]
             ],
            'crop' => [
                'options' => [
                    'position' => 'center', // http://image.intervention.io/api/fit
                 ]
            ],
        ]
    ],
];
