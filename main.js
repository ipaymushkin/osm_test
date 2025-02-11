import './style.css';
import {Feature, Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile.js';
import OSM from 'ol/source/OSM';
// import StadiaMaps from 'ol/source/StadiaMaps';
import VectorSource from 'ol/source/Vector';
import {fromLonLat, toLonLat} from "ol/proj";
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from "ol/layer/Vector";
import {Circle, Fill, Icon, Stroke, Style, Text} from 'ol/style';
import {Point} from "ol/geom";
import {Heatmap as HeatmapLayer} from 'ol/layer';
import KML from 'ol/format/KML';
import {getVectorContext} from 'ol/render';
import {defaults as defaultInteractions} from 'ol/interaction';
import {throttle} from "lodash";
import Image from 'ol/layer/Image';

import {FPS} from 'yy-fps'
import {Pane} from 'tweakpane';

import IDW from 'ol-ext/source/IDW';
import Draw from 'ol/interaction/Draw';

// tweakpane
const PARAMS = {
    layerInnerOpacity: .1,
    layerBorderOpacity: .5,
    layerStrokeWidth: 1,
    layerActiveStrokeWidth: 4,
    layerColor: {r: 255, g: 255, b: 255},
    strokeColor: {r: 255, g: 255, b: 255, a: 0.5},
    theme: 'dark',
};

const pane = new Pane();

const layerColor = pane.addBinding(PARAMS, 'layerColor');
// const strokeColor = pane.addBinding(PARAMS, 'strokeColor');

const layerStrokeWidth = pane.addBinding(
    PARAMS, 'layerStrokeWidth',
    {min: 1, max: 10, step: 1}
);

const layerActiveStrokeWidth = pane.addBinding(
    PARAMS, 'layerActiveStrokeWidth',
    {min: 1, max: 10, step: 1}
);

const layerInnerOpacity = pane.addBinding(
    PARAMS, 'layerInnerOpacity',
    {min: 0, max: 1, step: .02}
);

// `options`: list
const mapTheme = pane.addBinding(
    PARAMS, 'theme',
    {options: {Dark: 'dark', Light: 'light'}}
);

// FPS meter
const fps = new FPS()

function update() {

    fps.frame()

    requestAnimationFrame(update)
}

update()

const markerGenerator = (sourceFrom, sourceTo) => {
    sourceFrom.getFeatures().forEach((feature, idx) => {
            // if (feature.getGeometry().getType() === 'Polygon') {
            // console.log('feature', feature)
            const coords = feature.getGeometry().getExtent();
            const iconFeature = new Feature({
                geometry: new Point([(coords[0] + coords[2]) / 2, (coords[1] + coords[3]) / 2])
            })

            const svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" height="150px" width="150px" viewBox="0 0 20 20">

            <circle r="9" cx="10" cy="10" fill="transparent"
                      stroke="rgba(100, 223, 230, 1)"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-dasharray="calc(50 * 31.42 / 100) 31.42"
                stroke-dashoffset="-${Math.floor((Math.random()) * 30)}"
            />
            
            <circle r="9" cx="10" cy="10" fill="transparent"
                      stroke="rgba(235, 121, 87, 1)"
                      stroke-width="2"
                      stroke-dasharray="calc(50 * 31.42 / 100) 31.42"
                      stroke-linecap="round"
                      stroke-dashoffset="-${Math.floor((Math.random() + 50) * 100)}" 
            />

            <circle r="9" cx="10" cy="10" fill="transparent"
                      stroke="rgba(108, 22, 247, 1)"
                      stroke-width="2"
                      stroke-dasharray="calc(50 * 31.42 / 100) 31.42"
                      stroke-linecap="round"
                        stroke-dashoffset="-${Math.floor((Math.random() + 50) * 100)}"
            />

            <circle r="9" cx="10" cy="10" fill="transparent"
                    stroke="rgba(245, 194, 69, 1)"
                    stroke-width="2"
                    stroke-dasharray="calc(50 * 31.42 / 100) 31.42"
                    stroke-linecap="round"
                    stroke-dashoffset="-${Math.floor((Math.random() + 50) * 100)}"
            />
            
            <circle r="8" cx="10" cy="10" fill="rgba(45, 43, 57, 1)" /> 
           
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="3px" fill="white" font-family="Arial, Helvetica, sans-serif" font-weight="bold">${getRandomInt(1, 1000)}</text>
            </svg>`;

            const style = new Style({
                image: new Icon({
                    opacity: 1,
                    src: 'data:image/svg+xml;utf8,' + svg,
                    scale: 0.6
                })
            });

            iconFeature.setStyle(style)

            sourceTo ? sourceTo.addFeatures([iconFeature]) : sourceFrom.addFeatures([iconFeature])

            // }
        }
    )
}

/**
 * функция для стилизации фич
 * @param feature
 * @returns {{Polygon: Style, MultiPolygon: Style}}
 */
const styles = (feature) => {
    const isActive = feature.get('isActive') === true;
    return ({
        'Polygon': new Style({
            stroke: new Stroke({
                color: `rgba(255, 255, 255, 0.3)`,
                width: isActive ? PARAMS.layerActiveStrokeWidth : PARAMS.layerStrokeWidth,
            }),
            fill: new Fill({
                color: `rgba(${PARAMS.layerColor.r},${PARAMS.layerColor.g}, ${PARAMS.layerColor.b}, ${PARAMS.layerInnerOpacity})`,
            }),
        }),
        'MultiPolygon': new Style({
            stroke: new Stroke({
                color: 'rgba(255, 255, 255, 0.2)',
                width: isActive ? PARAMS.layerActiveStrokeWidth : PARAMS.layerStrokeWidth,
            }),
            fill: new Fill({
                color: `rgba(${PARAMS.layerColor.r},${PARAMS.layerColor.g}, ${PARAMS.layerColor.b}, ${PARAMS.layerInnerOpacity})`,
            }),
        }),

    });
}

/**
 * функция возвращающая нужные стили в зависимости от типа
 * @param feature
 * @returns {*}
 */
const styleFunction = (feature) => styles(feature)[feature.getGeometry().getType()];


const style = new Style({
    fill: new Fill({
        color: 'black',
    }),
});

/**
 * функция генератор рандомных целых чисел
 * @param min
 * @param max
 * @returns {number}
 */
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
const getRandomFloat = (min, max) => Math.random() * (max - min + 1) + min;

/**
 * наложение стилей на тайл
 * @param tile
 * тормозит из-за filter
 */
const handleTile = (tile) => {
    tile.on('prerender', (evt) => {
        if (evt.context) {
            const context = evt.context;
            context.filter = 'grayscale(80%) invert(100%) hue-rotate(0deg)';
            context.globalCompositeOperation = 'source-over';
        }
    });
    tile.on('postrender', (evt) => {
        if (evt.context) {
            const context = evt.context;
            context.filter = 'none';
        }
    });
}

const randomIntFromInterval = (min, max) => {
    return Math.random() * (max - min + 1) + min;
}

(async () => {
    /**
     * создание обрезанного слоя на основе обрезанного ветора
     * @type {VectorLayer<VectorSource<Feature<import("../geom/Geometry.js").default>>, import("./BaseVector.js").ExtractedFeatureType<VectorSource<Feature<import("../geom/Geometry.js").default>>>>}
     */


    /**
     * скачивание карты Москвы (общий полигон для Москвы без разбивки по районам)
     * @type {Response}
     */

    const clipResponse = await fetch('./static/moscow_full.geojson');
    const clipGeoJson = await clipResponse.json();

    /**
     * создание обрезанного вектора на основе геоджесона (общий полигон для Москвы без разбивки по районам)
     * @type {VectorSource<Feature<import("../geom/Geometry.js").default>>}
     */
    const clipVectorSource = new VectorSource({
        features: new GeoJSON().readFeatures(clipGeoJson, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        }),
    });

    const clipVectorLayer = new VectorLayer({
        source: clipVectorSource,
        style: styleFunction,
    });
    

    /**
     * функция обработки хитмапы
     * @param url
     * @param colors
     * @returns {Heatmap<import("../Feature.js").default<import("../geom.js").Geometry>, VectorSource<import("../Feature.js").default<import("../geom.js").Geometry>>>}
     */
    const handleHeatMap = (url, colors) => {
        /**
         * создание хитмапы из kml файла
         * @type {Heatmap<import("../Feature.js").default<import("../geom.js").Geometry>, VectorSource<import("../Feature.js").default<import("../geom.js").Geometry>>>}
         */
        const source = new VectorSource();

        const heatmap = new HeatmapLayer({
            source: source,
            blur: 70,
            radius: getRandomInt(40,100),
            weight: (feature) => {
                // const name = feature.get('name');
                // const magnitude = parseFloat(name.substr(2));
                // return Math.random();
            },
            gradient: colors,
            opacity: 0.95,
            // extent: clipVectorLayer.getSource().getExtent(),
            declutter: true,
            // maxResolution: 100,
            // minResolution: 1,
        });

        for (let i = 0; i < 30; i++) {
            const point = new Point(fromLonLat([getRandomFloat(36.896666, 36.898), getRandomFloat(55.2, 54.9)]));
            const pointFeature = new Feature({
                geometry: point,
                weight: getRandomFloat(0.5, 1),
            });

            source.addFeature(pointFeature)
        }


        /**
         * задание цвета для хитмапы
         */
        // heatmap.setGradient(colors);
        // heatmap.setBlur(0);
        heatmap.setMaxZoom(12);

        return heatmap;
    }

    let districtsVectorLayer = undefined;

    const fetchData = async () => {

        // Карта районов
        const districtsResponse = await fetch('./static/ao.geojson');
        const districtsGeoJson = await districtsResponse.json();

        const districtsVectorSource = new VectorSource({
            features: new GeoJSON().readFeatures(districtsGeoJson, {
                dataProjection: 'EPSG:4326',
                featureProjection: 'EPSG:3857'
            }),
        });

        districtsVectorLayer = new VectorLayer({
            source: districtsVectorSource,
            style: styleFunction,
        });


        /**
         * скачивание геоджесона (для районов Москвы)
         * @type {Response}
         */
        // const baseResponse = await fetch('./static/Moscow.geojson');
        // const baseGeoJson = await baseResponse.json();

        /**
         * создание базового вектора на основе геоджесана (для районов Москвы)
         * @type {VectorSource<Feature<import("../geom/Geometry.js").default>>}
         */
        // const baseVectorSource = new VectorSource({
        //     features: new GeoJSON().readFeatures(baseGeoJson, {
        //         dataProjection: 'EPSG:4326',
        //         featureProjection: 'EPSG:3857'
        //     }),
        // });

        /**
         * создание базового слоя на основе базового вектора
         * @type {VectorLayer<VectorSource<Feature<import("../geom/Geometry.js").default>>, import("./BaseVector.js").ExtractedFeatureType<VectorSource<Feature<import("../geom/Geometry.js").default>>>>}
         */
        // const baseVectorLayer = new VectorLayer({
        //     source: baseVectorSource,
        //     style: styleFunction,
        // });

        /**
         * создание базового тайла (вся карта мира, но без карты Москвы)
         * @type {TileLayer<OSM>}
         */
        const baseTile = new TileLayer({
            source: new OSM(),
            background: 'none',
        });

        /**
         * создание базового тайла (вся карта мира, но без карты Москвы)
         * @type {TileLayer<StadiaMaps>}
         */
        // const baseTileStadia = new TileLayer({
        //     source: new StadiaMaps({
        //         layer: 'alidade_smooth_dark',
        //         retina: true,
        //     }),
        //     background: 'none',
        // });

        /**
         * создание обрезанного тайла (только карта Москвы)
         * @type {TileLayer<OSM>}
         */
        const clipTile = new TileLayer({
            source: new OSM(),
            background: 'none',
        });

        // /**
        //  * создание обрезанного тайла (только карта Москвы)
        //  * @type {TileLayer<StadiaMaps>}
        //  */
        // const clipTileStadia = new TileLayer({
        //     source: new StadiaMaps({
        //         layer: 'alidade_smooth_dark',
        //         retina: true,
        //     }),
        //     background: 'none',
        // });


        if((window.type === 1) || (window.type === 3) || (window.type === 5)) {
            handleTile(baseTile);
            handleTile(clipTile);
        }


        const heatmaps = [
            handleHeatMap('./static/HeatMap4.kml', ['#669ACA', '#669ACA']),
            handleHeatMap('./static/HeatMap3.kml', ['#690095', '#690095']),
            handleHeatMap('./static/HeatMap2.kml', ['#FF7500', '#FF7500']),
            handleHeatMap('./static/HeatMap.kml', ['#CD2A00', '#CD2A00']),
            // handleHeatMap('./static/HeatMap5.kml', ['#E6943E', '#E6943E']),
            // handleHeatMap('./static/HeatMap6.kml', ['#D73914', '#D73914']),
            // handleHeatMap('./static/HeatMap7.kml', ['#596fb8', '#821bf1']),
        ];

        const getIdwFeatures = () => {
            const features = [];

            for (let i = 0; i < 50; i++) {
                const newFeature = new Feature({
                    geometry: new Point(
                        fromLonLat([randomIntFromInterval(37.3, 37.4), randomIntFromInterval(55.42, 55.46)])),
                    'val': getRandomInt(1, 255),
                });
                features.push(newFeature);
            }

            return features
        }

        const idwSource = new VectorSource({
            features: getIdwFeatures()
        })

        const idw = new IDW({
            scale: 8,
            maxD: 10000000,
            source: idwSource,
            weight: 'val',
        });

        const idwImageLayer = new Image({
            title: 'idw',
            source: idw,
            opacity: 0.15,
        })

        const list = Array(50).fill(0).map(() => {
            const idwSource = new VectorSource({
                features: getIdwFeatures()
            })

            const idw = new IDW({
                // useWorker: true,
                // lib: {
                //     hue2rgb: function (h) {
                //         h = (h + 6) % 6;
                //         if (h < 1) return Math.round(h * 255);
                //         if (h < 3) return 255;
                //         if (h < 4) return Math.round((4 - h) * 255);
                //         return 0;
                //     }
                // },
                // getColor: function (v) {
                //     var h = 40 - (0.04 * v);
                //     return [
                //         hue2rgb(h + 2),
                //         hue2rgb(h),
                //         hue2rgb(h - 2),
                //         255
                //     ];
                // },
                scale: 2,
                maxD: getRandomInt(1000, 5000),
                source: idwSource,
                weight: 'val',
            });
            return new Image({
                title: 'idw',
                source: idw,
                opacity: 0.2,
            })
        })


        /**
         * обрезка базового тайла (вырезание из карты города Москва)
         */
        baseTile.on('postrender', function (e) {
            const vectorContext = getVectorContext(e);
            e.context.globalCompositeOperation = 'destination-out';
            clipVectorLayer.getSource().forEachFeature(function (feature) {
                vectorContext.drawFeature(feature, style);
            });
            e.context.globalCompositeOperation = 'source-over';
        });

        /**
         * обрезка обрезанного тайла (вырезание всей карты - оставляем только Москву)
         */
        clipTile.on('postrender', function (e) {
            const vectorContext = getVectorContext(e);
            e.context.globalCompositeOperation = 'destination-in';
            clipVectorLayer.getSource().forEachFeature(function (feature) {
                vectorContext.drawFeature(feature, style);
            });
            e.context.globalCompositeOperation = 'source-over';
        });

        // idwImageLayer.on('postrender', function (e) {
        //     const vectorContext = getVectorContext(e);
        //     e.context.globalCompositeOperation = 'destination-in';
        //     clipVectorLayer.getSource().forEachFeature(function (feature) {
        //         vectorContext.drawFeature(feature, style);
        //     });
        //     e.context.globalCompositeOperation = 'source-over';
        // });

        const handleLayers = () => {
            switch(window.type) {
                case 1:
                    return [
                        clipTile,
                        ...heatmaps,
                        baseTile,
                        districtsVectorLayer,
                        clipVectorLayer,
                    ]
                case 2:
                    return [
                        clipTile,
                        ...heatmaps,
                        baseTile,
                        districtsVectorLayer,
                        clipVectorLayer,
                    ]
                case 3:
                    return [
                        clipTile,
                        ...list,
                        baseTile,
                        districtsVectorLayer,
                        clipVectorLayer,
                    ]
                case 4:
                    return [
                        clipTile,
                        ...list,
                        baseTile,
                        districtsVectorLayer,
                        clipVectorLayer,
                    ]
                case 5:
                    return [
                        clipTile,
                        idwImageLayer,
                        baseTile,
                        districtsVectorLayer,
                        clipVectorLayer,
                    ]
            }

            // return [
            //     clipTile,
            //     // ...heatmaps,
            //     // idwImageLayer,
            //     ...list,
            //     baseTile,
            //     districtsVectorLayer,
            //     clipVectorLayer,
            //     // baseVectorLayer,
            // ]
        }

        /**
         * создание вью для карты
         * @type {View}
         */
        const view = new View({
            center: fromLonLat([37.618423, 55.751244]),
            zoom: 11,
        });

        /**
         * создание карты
         * @type {Map}
         */
        const map = new Map({
            target: 'map',
            renderer: 'canvas',
            layers: handleLayers(),
            view,
            controls: [],
            interactions: defaultInteractions({
                mouseWheelZoom: false,
            })
        });

        const vectorSource = new VectorSource({
            // features: [iconFeature],
        });

        const vectorLayer = new VectorLayer({
            source: vectorSource,
            // zIndex: 1
        });

        map.addLayer(vectorLayer);

        /**
         * переменная для хранения маркеров
         * @type {*[]}
         */
        const markers = [];

        /**
         * переменная для хранения точек
         * @type {*[]}
         */
        let mapPoints = [];

        /**
         * добавление маркеров на карту
         */
        markerGenerator(districtsVectorSource, vectorSource)

        let lastFeature = null;

        /**
         * применение стилей к областям Москвы при наведении на них
         */
        /**
         * применение стилей к областям Москвы при наведении на них
         */

        const handleMove = (evt) => {
            if (lastFeature) {
                lastFeature.set('isActive', false);
            }
            map.forEachFeatureAtPixel(evt.pixel, feature => {
                lastFeature = feature;
                feature.set('isActive', true)
            })
        }
        // map.on('pointermove', throttle(handleMove, 100));

        const createMarker = (lng, lat, id) => {
            return new Feature({
                geometry: new Point([parseFloat(lng), parseFloat(lat)]),
                id: id
            });
        }

        /**
         * селектор для кнопки назад
         * @type {HTMLElement}
         */
        const backButton = document.getElementById('back_button');

        const pointSource = new VectorSource({
            // features: [createMarker(4161328, 7520469, '')],
        });

        const pointVector = new VectorLayer({
            source: pointSource,
            style: function (feature, resolution) {
                return [new Style({
                    image: new Circle({
                        fill: new Fill({
                            color: ['rgba(48,25,52,1)', 'rgba(139,128,0,1)', 'rgba(139,0,0,1)', "rgba(0,0,139,1)"][getRandomInt(0, 3)]
                        }),
                        radius: getRandomInt(5, 20)
                    }),
                }), new Style({
                    image: new Circle({
                        fill: new Fill({
                            color: ['rgba(48,25,52,1)', 'rgba(139,128,0,1)', 'rgba(139,0,0,1)', "rgba(0,0,139,1)"][getRandomInt(0, 3)]
                        }),
                        radius: getRandomInt(5, 20)
                    }),
                }), new Style({
                    image: new Circle({
                        fill: new Fill({
                            color: ['rgba(48,25,52,1)', 'rgba(139,128,0,1)', 'rgba(139,0,0,1)', "rgba(0,0,139,1)"][getRandomInt(0, 3)]
                        }),
                        radius: getRandomInt(5, 20)
                    }),
                })][getRandomInt(0, 2)]
            },
        });

        map.addLayer(pointVector);

        let layerVectorLayer = new VectorLayer({
            // source: layerVectorSource,
            style: styleFunction,
        });

        map.addLayer(layerVectorLayer)

        const fetchLayer = async (layer) => {

            const layerResponse = await fetch(`./static/${layer}.geojson`);
            const layerGeoJson = await layerResponse.json();

            const layerVectorSource = new VectorSource({
                features: new GeoJSON().readFeatures(layerGeoJson, {
                    dataProjection: 'EPSG:4326',
                    featureProjection: 'EPSG:3857'
                }),
            });

            layerVectorLayer.setSource(layerVectorSource);
            markerGenerator(layerVectorSource)

            return layerVectorLayer;
        }

        let regionClicked = false;
        let districtClicked = false;

        /**
         * применение стилей + переход к нужному району на клик
         */
        map.on('click', (evt) => {
            if (!regionClicked) {
                const coords = districtsVectorSource.forEachFeatureAtCoordinateDirect(evt.coordinate, feature => {
                    map.getView().fit(feature.getGeometry(), {duration: 500});
                    vectorSource.clear();
                    feature.set('isActive', true);
                    backButton.style.display = 'block';
                    const coords = feature.getGeometry().getExtent();
                    const layer = fetchLayer(feature.values_.OKATO);

                    return coords;
                })
            }

            if (!districtClicked) {
                const coords = layerVectorLayer.getSource().forEachFeatureAtCoordinateDirect(evt.coordinate, feature => {
                    map.getView().fit(feature.getGeometry(), {duration: 500});
                    vectorSource.clear();
                    feature.set('isActive', true);
                    backButton.style.display = 'block';

                    const coords = feature.getGeometry().getExtent();

                    pointSource.clear()

                    for (let i = 0; i < 30; i++) {
                        pointSource.addFeature(createMarker(getRandomInt(coords[0] + (coords[2] - coords[0]), coords[2] - (coords[2] - coords[0])), getRandomInt(coords[1] + (coords[3] - coords[1]), coords[3] - (coords[3] - coords[1])), ''))
                    }

                    return coords;
                })

            }

            // pointSource.addFeature(createMarker(getRandomInt(coords[0] + (coords[2] - coords[0]), coords[2] - (coords[2] - coords[0])), getRandomInt(coords[1] + (coords[3] - coords[1]), coords[3] - (coords[3] - coords[1])), ''))
        })

        const mapExtent = map.getView().calculateExtent()

        console.log(mapExtent);
        console.log(toLonLat([mapExtent[0], mapExtent[1]]));
        console.log(toLonLat([mapExtent[2], mapExtent[3]]));

        // let selected = null;

        // map.on('pointermove', function (e) {
        //     if (selected !== null) {
        //       selected.setStyle(undefined);
        //       selected = null;
        //     }

        //     map.forEachFeatureAtPixel(e.pixel, function (f) {
        //       selected = f;
        //       console.log('f', f.getGeometry().getStyle());

        //       if(selected) {
        //         console.log('selected', selected.getFill());

        //           selectStyle.setFill(f.get('COLOR') || '#eeeeee');
        //           f.setStyle(selectStyle);
        //       }
        //       return true;
        //     });

        //     if (selected) {
        //       status.innerHTML = selected.get('ECO_NAME');
        //     } else {
        //       status.innerHTML = '&nbsp;';
        //     }
        //   });

        backButton.addEventListener('click', () => {
            backButton.style.display = 'none';
            view.animate({
                zoom: 11,
                center: fromLonLat([37.618423, 55.751244]),
            });

            layerVectorLayer.setSource(null)

            districtClicked = false;
            regionClicked = false;

            pointSource.clear()
            markerGenerator(districtsVectorSource, vectorSource);

        })

        // map.addLayer(new VectorSource({
        //     title: 'source',
        //     source: idw.getSource(),
        //     style: function(f) {
        //       return new Style({
        //         // image: new ol.style.Circle({ radius: 2, fill: new ol.style.Fill({ color: '#000' }) }),
        //         text: new Text({
        //           text: f.get('val').toString(),
        //           stroke: new Stroke({ color: [255,255,255,128], width: 1.25 }),
        //         })
        //       });
        //     }
        //   }))

        // const draw = new Draw({type: 'Point', source: idw.getSource()});
        // // draw.feature.set('val', 22);
        // draw.on('drawend', function (e) {
        //     // console.log('here', e, e.feature, draw);
        //     // console.log('here--', idw.getSource(), idw.getSource().getFeatures());
        //
        //     // e.feature.set('val', Math.round(Math.random()*100));
        //     e.feature.set('val', Math.round(Math.random() * 100));
        // })
        // map.addInteraction(draw);

        // Add a set of features
        //   function addFeatures(size) {
        //     size = size || 100;
        //     var ext = map.getView().calculateExtent();
        //     var dx = ext[2]-ext[0];
        //     var dy = ext[3]-ext[1];
        //     var features = [];
        //     for (var i=0; i<size; ++i){
        //       var f = new ol.Feature(new ol.geom.Point([
        //         ext[0]+dx*Math.random(),
        //         ext[1]+dy*Math.random()
        //       ]));
        //       f.set('val', Math.round(Math.random()*100));
        //       features.push(f);
        //     }
        //     idw.getSource().addFeatures(features)
        //   }
    }

    fetchData();


    


// TWEAKPANE INTERACTIONS

    layerInnerOpacity.on('change', (e) => {
        PARAMS.layerInnerOpacity = e.value;
        districtsVectorLayer.getSource().changed()
    })

    layerActiveStrokeWidth.on('change', (e) => {
        PARAMS.layerActiveStrokeWidth = e.value;
        districtsVectorLayer.getSource().changed()
    })

    layerStrokeWidth.on('change', (e) => {
        PARAMS.layerStrokeWidth = e.value;
        districtsVectorLayer.getSource().changed()
    })

    layerColor.on('change', (e) => {
        PARAMS.layerColor = e.value;
        districtsVectorLayer.getSource().changed()
    })
})()

