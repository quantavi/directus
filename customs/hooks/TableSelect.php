<?php

namespace Directus\Customs\Hooks;

use Directus\Hook\HookInterface;
use Directus\Hook\Payload;
use Directus\Bootstrap;
use Directus\Util\StringUtils;

class TableSelect implements HookInterface
{
    /**
     * @param Payload $payload
     *
     * @return Payload
     */
    public function handle($payload = null)
    {
        if (StringUtils::endsWith($payload->attribute('tableName'), 'files')) {
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
                    
                    $additional[ $i ][ $r[ $j ].'_url' ] = $additional[$i]['url'];
                    
                    foreach( $file as $filefound ) {
                        $additional[ $i ][ $r[ $j ].'_url' ] = preg_replace("/(\/var\/www\/html\/)[a-z]{8}/", "", $filefound);
                    }
                    
                }
                
            }
            
            // Update Payload
            $payload->replace($additional);
        }
        
        return $payload;
    }
}
