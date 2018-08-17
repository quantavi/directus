<?php

use Directus\Bootstrap;
use Directus\Database\TableGatewayFactory;
use Directus\View\JsonView;

// Slim App
$app = Bootstrap::get('app');

// Simple GET endpoint example
$app->get('/exhibitionsby', function () use ($app) {
    // GET params
    $museum_id = $app->request()->params('museum');
    $depth = $app->request()->params('depth') || 0;
    $debug = $app->request()->params('debug') || 0;
    
    // Junction Table connection
    $junctionTable = TableGatewayFactory::create('junction_exhibition_to_museum');
    $junctionTableData = $junctionTable->getItems([
        'museum' => $museum_id
    ])['data'];
    
    // Exhibitions Table connection
    $exhibitionsTable = TableGatewayFactory::create('exhibitions');
    
    // Directus Files Table connection
    $directusFilesTable = TableGatewayFactory::create('directus_files');
    
    // Arrays
    $filteredJunctionTableData = [];
    $relatedTablesIds = [];
    $relatedTables = [];
    
    // Get root_url & root_ratios_url
    $config = Bootstrap::get('config');
    $fs = $config['filesystem'];
    $root_url = $fs['root_url'];
    $root_ratios_url = $fs['root_ratios_url'];
    
    // Array with all ratios to check
    $r = ['sixteen_nine', 'four_three', 'three_two', 'one_one', 'free'];
    
    // Compare id from junction entry to given museum id and get table with it if equals
    foreach ($junctionTableData as $data) {
        if ($data['museum'] == $museum_id) {
            array_push($filteredJunctionTableData, $data);
            array_push($relatedTablesIds, $data['id']);
            
            $entry = $exhibitionsTable->findOneBy('id', $data['id']);
            
            $image = $directusFilesTable->findOneBy('id', $entry['image']);
            
            $name = $image['name'];
            $image['url'] = "$root_url/$name";
            
            for($j = 0; $j < count($r); $j++) {

                $file = glob( $root_ratios_url.'/'.$r[ $j ].'/'.substr($name, 0, -4).'*' );
                foreach( $file as $filefound ) {
                    $image[ $r[ $j ].'_url' ] = str_replace( '/var/www/html', '', $filefound );
                }
                
            }
            
            $entry['image'] = $image;
            
            array_push($relatedTables, $entry);
        }
    }
    
    // Add Descriptions and Authors
    if ($depth >= 1) {
        
    }
    
    // Return
    if ($debug) {
        return JsonView::render([
            'GET params' => $_GET,
            'museum' => $museum_id,
            'related tables ids' => $relatedTablesIds,
            'junction' => $junctionTableData,
            'filtered' => $filteredJunctionTableData,
            'data' => $relatedTables
        ]);
    } else {
        return JsonView::render([
            'data' => $relatedTables
        ]);
    }
    
    
});
