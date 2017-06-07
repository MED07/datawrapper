<?php



/**
 * Skeleton subclass for representing a row from the 'theme' table.
 *
 *
 *
 * You should add additional methods to this class to meet the
 * application requirements.  This class will only be generated as
 * long as it does not already exist in the output directory.
 *
 * @package    propel.generator.datawrapper
 */
class Theme extends BaseTheme
{
    public function getCSS($visLess) {
        global $app;
        $theme = $this;

        // compile: theme-variables, chart.base.less, visulization.less
        $data = $this->getThemeDataAsFlatArray();

        $twig = $app->view()->getEnvironment();
        $twigData = $data;
        $twigData['fonts'] = $this->getAssetFonts();
        $baseLess = $twig->render('chart-styles.less.twig', $twigData);

        $allThemeLess = $this->getLess();

        while (!empty($theme->getExtend())) {
            $theme = ThemeQuery::create()->findPk($theme->getExtend());
            $allThemeLess .= "\n\n\n" . $theme->getLess();
        }

        $allVisLess = "";

        foreach ($visLess as $vis) {
            $allVisLess .= "\n\n\n" . file_get_contents($vis);
        }

        $less = new lessc;
        $less->setVariables($data);
        return $less->compile($baseLess . "\n" . $allVisLess . "\n" . $allThemeLess);
    }

    public function getThemeData() {
        $theme = $this;
        $themeData = [$theme->getData()];

        while ($theme->getExtend() != null) {
            $theme = ThemeQuery::create()->findPk($theme->getExtend());
            $themeData[] = $theme->getData();
        }

        $themeList = array_reverse($themeData);

        $data = array();

        foreach ($themeList as $theme) {
            $data = $this->extendArray($data, $theme);

        }

        return $data;
    }


    public function getThemeDataAsFlatArray($data = null, $prefix = "") {
        if ($data == null) $data = $this->getThemeData();

        $f = array();

        foreach ($data as $k => $d) {
            $px = $prefix;

            if ($px == "") {
                $px = $k;
            } else {
                $px .= "_" . $k;
            }

            if (is_array($d)) {
                if (sizeof($d) > 0) {
                    $f = array_merge($f, $this->getThemeDataAsFlatArray($d, $px));
                }
            } else {
                $f[$px] = $d;
            }
        }

        return $f;
    }

    public function getAssetUrl($name) {
        $assets = json_decode(parent::getAssets(), true);
        if (!is_array($assets)) $assets = array();
        return $assets[$name]['url'];
    }

    public function addAssetFile($name, $url) {
        $assets = json_decode(parent::getAssets(), true);
        if (!is_array($assets)) $assets = array();

        $assets[$name] = array(
            "url" => $url,
            "type" => "file"
        );

        $this->setAssets(json_encode($assets));
        $this->save();
    }

    public function addAssetFont($name, $urls) {
        $assets = json_decode(parent::getAssets(), true);
        if (!is_array($assets)) $assets = array();

        $assets[$name] = [];
        $assets[$name]['files'] = $urls;
        $assets[$name]['type'] = "font";

        $this->setAssets(json_encode($assets));
        $this->save();
    }

    public function getAssetFiles() {
        $assets = json_decode(parent::getAssets(), true);
        if (!is_array($assets)) $assets = array();
        return array_filter($assets, function($v) { return $v['type'] == "file"; });
    }

    public function getAssetFonts() {
        $assets = json_decode(parent::getAssets(), true);
        if (!is_array($assets)) $assets = array();
        return array_filter($assets, function($v) { return $v['type'] == "font"; });
    }

    public function removeAsset($name) {
        $assets = json_decode(parent::getAssets(), true);
        if (!is_array($assets)) $assets = array();
        unset($assets[$name]);
        $this->setAssets(json_encode($assets));
        $this->save();
    }

    /**
     * returns the theme data
     */
    public function getData($key = null) {
        $meta = json_decode(parent::getData(), true);
        if (!is_array($meta)) $meta = array();
        if (empty($key)) return $meta;
        $keys = explode('.', $key);
        $p = $meta;
        foreach ($keys as $key) {
            if (isset($p[$key])) $p = $p[$key];
            else return null;
        }
        return $p;
    }

    /*
     * update a part of the data
     */
    public function updateData($key, $value) {
        $meta = $this->getData();
        $keys = explode('.', $key);
        $p = &$meta;
        foreach ($keys as $key) {
            if (!isset($p[$key])) {
                $p[$key] = array();
            }
            $p = &$p[$key];
        }
        $p = $value;
        $this->setData(json_encode($meta));
    }

    public function getRawData($key = null) {
        return parent::getData();
    }

    /*
     * Two helper functions that handle array extensions
     */

    private function isNumericArray($array) {
        foreach ($array as $a => $b) {
            if (!is_int($a)) {
                return false;
            }
        }

        return true;
    }

    private function extendArray($arr, $arr2) {
        foreach ($arr2 as $key => $val) {
            $arr1IsObject = (isset($arr[$key]) && is_array($arr[$key]) && !$this->isNumericArray($arr[$key]));
            $arr2IsObject = (isset($val) && is_array($val) && !$this->isNumericArray($val));

            if ($arr1IsObject && $arr2IsObject) {
                $arr[$key] = $this->extendArray($arr[$key], $val);
            } else {
                $arr[$key] = $val;
            }
        }

        return $arr;
    }
}
