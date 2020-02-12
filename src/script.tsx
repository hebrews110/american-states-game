import 'core-js/es/promise';
import 'core-js/features/array/from';
import queryString from 'query-string';
import { modeDemandsDirectMap } from './InteractiveMap';

/*
function App(props) {
    return <div></div>;
}
*/

window.onload = async function() {
    const parsed = queryString.parse(location.search);
    if(typeof parsed.mode != 'string') {
        window.alert("Invalid mode chosen.");
        return;
    }
    if(!modeDemandsDirectMap(parsed.mode)) {
    } else {
        const { loadMap, runInteractiveGame } = await import("./InteractiveMap");
        const svgRoot = await loadMap();
        runInteractiveGame(parsed, svgRoot);
    }
    //ReactDOM.render(<App/>, document.getElementById("game-container"));
};