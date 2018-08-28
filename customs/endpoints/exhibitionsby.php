<?php

use Directus\Bootstrap;
use Directus\Database\TableGatewayFactory;
use Directus\View\JsonView;

// Slim App
$app = Bootstrap::get('app');

// Debug Table
$debugTable = [];

function debugAdd($item) {
    global $debugTable;
    array_push($debugTable, $item);
}

function getTableItems($table, $params = [], $group = 'data') {
    return TableGatewayFactory::create($table)->getItems($params)[$group];
}

function filterBy($rawData, $compare, $to, $return = null) {
    $filtered = [];
    foreach($rawData as $data) {
        if ($data[$compare] == $to) {
            array_push($filtered, $return ? $data[$return] : $data);
        }
    }
    return $filtered;
}

function getFilteredItems($tableToParse, $compare, $to, $connectBy = null, $additionalTable, $depth = 0) {
    $filteredItemsArray = [];
    $filteredItems = filterBy($tableToParse, $compare, $to, $connectBy);
    foreach ($filteredItems as $item) {
        $item = getItemBy($additionalTable, $connectBy != null ? $connectBy : 'id', $item);
        if ($item['photo']) {
            $item['photo'] = addImagesDataIfExistTo(getFileBy('id', $item['photo']));
        }
        if ($depth == 2) {
            $table = substr($additionalTable, 0, strlen($additionalTable) - 1);
            $tableName = "{$table}_translations";
            $filteredTable = [];
            foreach (getTableItems($tableName) as $translation) {
                if ($translation['author'] == $item['id']) {
                    array_push($filteredTable, $translation);
                }
            }
            $item['translations'] = $filteredTable;
        }
        array_push($filteredItemsArray, $item);
    }
    return $filteredItemsArray;
}

function getExhibitionBy($field, $value) {
    return TableGatewayFactory::create('exhibitions')->findOneBy($field, $value); 
}

function getItemBy($table, $field, $value) {
    return TableGatewayFactory::create($table)->findOneBy($field, $value);
}

function getFileBy($field, $value) {
    return TableGatewayFactory::create('directus_files')->findOneBy($field, $value); 
}

function addImagesDataIfExistTo($object, $filenameField = null) {
    // Get root_url & root_ratios_url 
    $config = Bootstrap::get('config');
    $fs = $config['filesystem'];
    $root_url = $fs['root_url'];
    $root_ratios_url = $fs['root_ratios_url'];
    
    // Array with all ratios to check
    $r = ['sixteen_nine', 'four_three', 'three_two', 'one_one', 'free'];
    
    $name = $filenameField ? $object[$filenameField] : $object['name'];
    $object['url'] = "$root_url/$name";
    
    for($j = 0; $j < count($r); $j++) {
        
        $file = glob( $root_ratios_url.'/'.$r[ $j ].'/'.substr($name, 0, -4).'*' );
        foreach( $file as $filefound ) {
            $object[ $r[ $j ].'_url' ] = str_replace( '/var/www/html', '', $filefound );
        }
        
    }
    
    return $object;
}

function convertToNumeric($itemGroup) {
    foreach ($itemGroup as $key) {
        $value = $itemGroup[$key];
        if (is_numeric($value)) {
            $itemGroup[$key] = intval($value);
        }
    }
    return $itemGroup;
}

// Simple GET endpoint example
$app->get('/exhibitionsby', function () use ($app) {
    global $debugTable;
    
    // GET params
    $museum_id = $app->request()->params('museum');
    $exhibition_id = $app->request()->params('id');
    $depth = $app->request()->params('depth') ? $app->request()->params('depth') : 0;
    $debug = $app->request()->params('debug') || 0;
    $authorsonly = $app->request()->params('authorsonly') || 0;
    
    debugAdd($authorsonly);
    
    if ($museum_id && $exhibition_id) {
        return JsonView::render([
            'message' => 'It\'s impossible to return exhibitions by museum id and single exhibition in the same time.'
        ]);
    }

    $junctionTableData = getTableItems('junction_exhibition_to_museum');
    
    // Arrays
    $filteredJunctionTableData = [];
    $relatedTablesIds = [];
    $relatedTables = [];
    
    if ($museum_id && !$exhibition_id) {
        // Compare id from junction entry to given museum id and get table with it if equals
        foreach ($junctionTableData as $data) {
            if ($data['museum'] == $museum_id) {
                array_push($filteredJunctionTableData, $data);
                array_push($relatedTablesIds, $data['id']);
                
                $entry = getExhibitionBy('id', $data['id']);
                $entry['image'] = addImagesDataIfExistTo(getFileBy('id', $entry['image']));
                
                // Add Descriptions and Authors
                if ($depth >= 1) {
                    // Add Descriptions
                    $translationsTable = getTableItems('exhibition_translations');
                    $entry['translations'] = filterBy($translationsTable, 'exhibition', $entry['id']);
                    
                    // Add Authors
                    $junctionAuthorsExhibitionsTable = getTableItems('junction_author_to_exhibition');
                    $entry['authors'] = getFilteredItems($junctionAuthorsExhibitionsTable, 'exhibition', $entry['id'], 'id', 'authors', $depth);
                }
                
                $entry['museum_id'] = $museum_id;
                
                array_push($relatedTables, $entry);
            }
        }
    } else if ($exhibition_id && !$museum_id) {
        if ($authorsonly) {
            $temp_entry = getExhibitionBy('id', $exhibition_id);
            
            // Add Only Authors
            $junctionAuthorsExhibitionsTable = getTableItems('junction_author_to_exhibition');
            $filteredItems = filterBy($junctionAuthorsExhibitionsTable, 'exhibition', $temp_entry['id'], 'id');
            foreach ($filteredItems as $item) {
                $item = getItemBy('authors', 'id', $item);
                if ($item['photo']) {
                    $item['photo'] = addImagesDataIfExistTo(getFileBy('id', $item['photo']));
                }
                if ($depth == 2) {
                    $tableName = "author_translations";
                    $filteredTable = [];
                    foreach (getTableItems($tableName) as $translation) {
                        if ($translation['author'] == $item['id']) {
                            array_push($filteredTable, $translation);
                        }
                    }
                    $item['translations'] = $filteredTable;
                }
                
                $item['exhibition_id'] = $exhibition_id;
                
                array_push($relatedTables, $item);
            }
            
        } else {
            $entry = getExhibitionBy('id', $exhibition_id);
            $entry['image'] = addImagesDataIfExistTo(getFileBy('id', $entry['image']));
            
            // Add Descriptions and Authors
            if ($depth >= 1) {
                // Add Descriptions
                $translationsTable = getTableItems('exhibition_translations');
                $entry['translations'] = filterBy($translationsTable, 'exhibition', $entry['id']);
                
                // Add Authors
                $junctionAuthorsExhibitionsTable = getTableItems('junction_author_to_exhibition');
                $entry['authors'] = getFilteredItems($junctionAuthorsExhibitionsTable, 'exhibition', $entry['id'], 'id', 'authors', $depth);
            }
            
            $entry['exhibition_id'] = $exhibition_id;

            array_push($relatedTables, $entry);
        }
    }
    
    // Return
    if ($debug) {
        return JsonView::render([
            'debug' => $debugTable,
            'data' => $relatedTables
        ]);
    } else {
        return JsonView::render([
            'data' => $relatedTables
        ]);
    }
    
    
});
