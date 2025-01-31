import './style.css';
import {Feature, Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import {fromLonLat} from "ol/proj";
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from "ol/layer/Vector";
import {Circle, Fill, Icon, Stroke, Style} from 'ol/style';
import {Point} from "ol/geom";
import {Heatmap as HeatmapLayer} from 'ol/layer';
import KML from 'ol/format/KML';
import {getVectorContext} from 'ol/render';
import {defaults as defaultInteractions} from 'ol/interaction';
import {throttle} from "lodash";

import { FPS } from 'yy-fps'
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

            <circle r="5" cx="10" cy="10" fill="transparent"
                      stroke="rgba(100, 223, 230, 1)"
                      stroke-width="10"
                      stroke-dasharray="calc(50 * 31.42 / 100) 31.42"
                stroke-dashoffset="-${Math.floor((Math.random()) * 30)}"
            />
            
            <circle r="5" cx="10" cy="10" fill="transparent"
                      stroke="rgba(235, 121, 87, 1)"
                      stroke-width="10"
                      stroke-dasharray="calc(50 * 31.42 / 100) 31.42" /> 
                      stroke-dashoffset="-${Math.floor((Math.random() + 50) * 100)}"
            <circle r="5" cx="10" cy="10" fill="transparent"
                      stroke="rgba(108, 22, 247, 1)"
                      stroke-width="10"
                      stroke-dasharray="calc(50 * 31.42 / 100) 31.42"
                        stroke-dashoffset="-${Math.floor((Math.random() + 50) * 100)}"
            />
            <circle r="5" cx="10" cy="10" fill="transparent"
                    stroke="rgba(245, 194, 69, 1)"
                    stroke-width="10"
                    stroke-dasharray="calc(50 * 31.42 / 100) 31.42"
                    stroke-dashoffset="-${Math.floor((Math.random() + 50) * 100)}"
            />
            
            <circle r="8" cx="10" cy="10" fill="rgba(45, 43, 57, 1)" /> 
           
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="5px" fill="white" font-family="Arial, Helvetica, sans-serif" font-weight="bold">${getRandomInt(1, 1000)}</text>
            </svg>`;

            const style = new Style({
                image: new Icon({
                    opacity: 1,
                    src: 'data:image/svg+xml;utf8,' + svg,
                    scale: 0.3
                })
            });

            iconFeature.setStyle(style)

            sourceTo? sourceTo.addFeatures([iconFeature]) : sourceFrom.addFeatures([iconFeature])
            
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
                color: 'rgba(255, 255, 255, 0.3)',
                width: isActive ? 4 : 1,
            }),
            fill: new Fill({
                color: 'rgba(255, 255, 255, 0.1)',
            }),
        }),
        'MultiPolygon': new Style({
            stroke: new Stroke({
                color: 'rgba(255, 255, 255, 0.2)',
                width: isActive ? 4 : 1,
            }),
            fill: new Fill({
                color: 'rgba(255, 255, 255, 0.1)',
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

/**
 * наложение стилей на тайл
 * @param tile
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
    const heatmap = new HeatmapLayer({
        source: new VectorSource({
            url,
            format: new KML({
                extractStyles: false,
            }),
        }),
        blur: 100,
        radius: Math.floor((Math.random() + 0.5) * 150),
        weight: (feature) => {
            const name = feature.get('name');
            const magnitude = parseFloat(name.substr(2));
            return magnitude - 5;
        },
    });

    /**
     * задание цвета для хитмапы
     */
    heatmap.setGradient(colors);

    return heatmap;
}

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

    const districtsVectorLayer = new VectorLayer({
        source: districtsVectorSource,
        style: styleFunction,
    });



    /**
     * скачивание геоджесона (для районов Москвы)
     * @type {Response}
     */
    const baseResponse = await fetch('./static/Moscow.geojson');
    const baseGeoJson = await baseResponse.json();

    /**
     * создание базового вектора на основе геоджесана (для районов Москвы)
     * @type {VectorSource<Feature<import("../geom/Geometry.js").default>>}
     */
    const baseVectorSource = new VectorSource({
        features: new GeoJSON().readFeatures(baseGeoJson, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        }),
    });

    /**
     * создание базового слоя на основе базового вектора
     * @type {VectorLayer<VectorSource<Feature<import("../geom/Geometry.js").default>>, import("./BaseVector.js").ExtractedFeatureType<VectorSource<Feature<import("../geom/Geometry.js").default>>>>}
     */
    const baseVectorLayer = new VectorLayer({
        source: baseVectorSource,
        style: styleFunction,
    });

    /**
     * создание базового тайла (вся карта мира, но без карты Москвы)
     * @type {TileLayer<OSM>}
     */
    const baseTile = new TileLayer({
        source: new OSM(),
    });

    /**
     * создание обрезанного тайла (только карта Москвы)
     * @type {TileLayer<OSM>}
     */
    const clipTile = new TileLayer({
        source: new OSM(),
    });

    handleTile(baseTile);
    handleTile(clipTile);

    const heatmaps = [
        handleHeatMap('./static/HeatMap.kml', ['#e1823e', '#f93519']),
        handleHeatMap('./static/HeatMap2.kml', ['#596fb8', '#821bf1']),
        handleHeatMap('./static/HeatMap3.kml', ['#E37D33', '#CE7647']),
        handleHeatMap('./static/HeatMap4.kml', ['#8B13CB', '#8B13CB']),
        handleHeatMap('./static/HeatMap5.kml', ['#E6943E', '#E6943E']),
        handleHeatMap('./static/HeatMap6.kml', ['#D73914', '#D73914']),
        handleHeatMap('./static/HeatMap7.kml', ['#596fb8', '#821bf1']),
    ];

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

    /**
     * создание обрезанного слоя на основе обрезанного ветора
     * @type {VectorLayer<VectorSource<Feature<import("../geom/Geometry.js").default>>, import("./BaseVector.js").ExtractedFeatureType<VectorSource<Feature<import("../geom/Geometry.js").default>>>>}
     */
    const clipVectorLayer = new VectorLayer({
        source: clipVectorSource,
        style: styleFunction,
    });

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
        layers: [
            clipTile,
            ...heatmaps,
            baseTile,
            districtsVectorLayer,
            clipVectorLayer,
            // baseVectorLayer,
        ],
        view,
        controls: [],
        interactions: defaultInteractions({
            mouseWheelZoom: false
        })
    });

    const vectorSource = new VectorSource({
        // features: [iconFeature],
    });

    const vectorLayer = new VectorLayer({
        source: vectorSource,
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
    map.on('pointermove', throttle(handleMove, 100));

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
        features: [createMarker(4161328, 7520469, '')],
    });

    const pointVector = new VectorLayer({
        source: pointSource,
        style: new Style({
            image: new Circle({
                fill: new Fill({
                    color: ['rgba(48,25,52,1)', 'rgba(139,128,0,1)', 'rgba(139,0,0,1)', "rgba(0,0,139,1)"][getRandomInt(0, 3)]
                }),
                radius: getRandomInt(5, 10)
            }),
        })
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

    /**
     * применение стилей + переход к нужному району на клик
     */
    map.on('click', (evt) => {
        const coords = districtsVectorSource.forEachFeatureAtCoordinateDirect(evt.coordinate, feature => {
            map.getView().fit(feature.getGeometry(), {duration: 500});
            vectorSource.clear();
            feature.set('isActive', true);
            backButton.style.display = 'block';
            const coords = feature.getGeometry().getExtent();
            const layer = fetchLayer(feature.values_.OKATO);

            return coords;
        })

        pointSource.addFeature(createMarker(getRandomInt(coords[0] + (coords[2] - coords[0]), coords[2] - (coords[2] - coords[0])), getRandomInt(coords[1] + (coords[3] - coords[1]), coords[3] - (coords[3] - coords[1])), ''))
    })

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
        
        pointSource.clear()
        markerGenerator(districtsVectorSource, vectorSource);

    })
}

fetchData();






