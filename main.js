import './style.css';
import {Feature, Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import {fromLonLat} from "ol/proj";
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from "ol/layer/Vector";
import {Circle as CircleStyle, Fill, Icon, Stroke, Style} from 'ol/style';
import {Point, Polygon} from "ol/geom";

const image = new CircleStyle({
    radius: 5,
    fill: null,
    stroke: new Stroke({color: 'purple', width: 10}),
});


const styles = (feature) => {
    const isActive = feature.get('isActive') === true;
    return ({
        'Polygon': new Style({
            stroke: new Stroke({
                color: 'rgba(255, 255, 255, 0.5)',
                width: isActive ? 4 : 1,
            }),
            fill: new Fill({
                color: 'rgba(255, 255, 255, 0.2)',
            }),
        }),

    });
}

const styleFunction = function (feature) {
    return styles(feature)[feature.getGeometry().getType()];
};

const fetchData = async () => {
    const response = await fetch('./static/Moscow.geojson');
    const geoJson = await response.json();


    const vectorSource = new VectorSource({
        features: new GeoJSON().readFeatures(geoJson, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
        }),
    });

    const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: styleFunction,
    });

    const tile = new TileLayer({
        source: new OSM(),
        // source: new StadiaMaps({
        //   layer: 'alidade_smooth_dark',
        //   retina: true,
        //   // apiKey: 'OPTIONAL'
        // }),
    });

    tile.on('prerender', (evt) => {
        // return
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

    const map = new Map({
        target: 'map',
        layers: [
            tile,
            vectorLayer,
        ],
        view: new View({
            center: fromLonLat([37.618423, 55.751244]),
            zoom: 9,
        }),
    });

    let lastFeature = null;

    map.on('pointermove', (evt) => {
        if (lastFeature) {
            lastFeature.set('isActive', false);
        }
        vectorSource.forEachFeatureAtCoordinateDirect(evt.coordinate, feature => {
            lastFeature = feature;
            feature.set('isActive', true)
        })
    })

    map.on('click', (evt) => {
        vectorSource.forEachFeatureAtCoordinateDirect(evt.coordinate, feature => {
            map.getView().fit(feature.getGeometry());
            lastFeature = feature;
            feature.set('isActive', true);
        })
    })


    vectorSource.getFeatures().forEach((feature, idx) => {
            if (feature.getGeometry().getType() === 'Polygon') {
                const coords = feature.getGeometry().getExtent();
                const iconFeature = new Feature({
                    geometry: new Point([(coords[0] + coords[2]) / 2, (coords[1] + coords[3]) / 2])
                })

                const svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" height="150px" width="150px" viewBox="0 0 20 20">
    
   <circle r="5" cx="10" cy="10" fill="bisque" /> 
  <circle r="5" cx="10" cy="10" fill="transparent"
          stroke="tomato"
          stroke-width="10"
          stroke-dasharray="10.99 31.4" />
  <circle r="5" cx="10" cy="10" fill="transparent"
          stroke="dodgerblue"
          stroke-width="10"
          stroke-dasharray="4.71 31.4"
stroke-dashoffset="-10.99"
/>
  <circle r="5" cx="10" cy="10" fill="transparent"
          stroke="gold"
          stroke-width="10"
          stroke-dasharray="9.42 31.4"
stroke-dashoffset="-15.7"
/>
   <circle r="5" cx="10" cy="10" fill="transparent"
          stroke="yellowgreen"
          stroke-width="10"
          stroke-dasharray="6.28 31.4"
stroke-dashoffset="-25.12"
/>
<circle r="8" cx="10" cy="10"/>
<text x="8" y="11" font-size="3px" fill="white" >20</text>
</svg>`;

                const style = new Style({
                    image: new Icon({
                        opacity: 1,
                        src: 'data:image/svg+xml;utf8,' + svg,
                        scale: 0.3
                    })
                });

                iconFeature.setStyle(style)

                const vectorSource = new VectorSource({
                    features: [iconFeature],
                });

                const vectorLayer = new VectorLayer({
                    source: vectorSource,
                });

                map.addLayer(vectorLayer);
            }
        }
    )

}

fetchData();






