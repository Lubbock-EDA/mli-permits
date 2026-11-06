// ===============================================================
// common.js - code shared by index.html and program.html. 
// Both pages load this file, so anything defined here can be used
// on either page.
// ===============================================================

// The four grant areas: web-address key -> diplay name and map color.
// The order here is the order the buttons appear.

const AREAS = { 
  'downtown':         { name: 'Downtown',         color: '#006072' },    // LEDA teal
  'east':             { name: 'East Lubbock',     color: '#243746' },    // LEDA slate
  '34th':             { name: '34th Street',      color: '#c5b9ac' },    // LEDA taupe
  'north-university': { name: 'North University', color: '#040707' }     // LEDA black
}; 

// Money with commas: 1234567 -> "$1,234,567"
function money(n) {
  return '$' + (n || 0).toLocaleString(); 
}

// Short money for the big number cards: 6589577 -> "$6.6M", 25000 -> "$25K"
function shortMoney(n) { 
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M'; 
  if (n >= 1000)    return '$' + Math.round(n / 1000) + 'K'; 
  return money(n); 
} 

// Creates a map in the box with this id, with the gray background + labels
function makeMap(boxId) { 
  const map = L.map(boxId, { zoomSnap: 0.25 });  
  
 L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri', maxZoom: 16
  }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16
  }).addTo(map); 
  return map; 
}

// Loads grants.geojson and hands back the list of grants
function loadGrants() { 
  return fetch('grants.geojson') 
    .then(response => response.json()) 
	.then(data => data.features); 
} 

// Fills in the four number cards from whatever list of grants it's given
// (all grants on the landing page, one area's grants on a program page)

function fillStats(grants) { 
  const granted  = grants.reduce((sum, g) => sum + (g.properties.grant || 0), 0); 
  const invested = grants.reduce((sum, g) => sum + (g.properties.investment || 0), 0); 
  
  document.getElementById('statCount').textContent = grants.length.toLocaleString(); 
  document.getElementById('statGranted').textContent = shortMoney(granted); 
  document.getElementById('statInvested').textContent = shortMoney(invested); 
  document.getElementById('statPerDollar').textContent = 
    granted ? '$' + (invested / granted).toFixed(2) : '-'; 
}

// Draws grant parcels on a map. Grants on the same parcel are grouped 
// into one shape whose hover box lists every grant on it.
// Returns the layer, so the page can zoom the map to fit it.
function drawGrants(map, grants) { 
  //1. Group by outline: grants with an identical shape share a parcel
  const groups = {}; 
  grants.forEach(g => {
    const key = JSON.stringify(g.geometry); 
	if (!groups[key]) groups[key] = []; 
	groups[key].push(g); 
  }); 
  
  // 2. One shape per parcel, carrying its list of grants
  const shapes = Object.values(groups).map(list => ({
    type: 'Feature', 
	geometry: list[0].geometry, 
	properties: { area: list[0].properties.areaKey, grants: list } 
  })); 
  
  // 3. Draw them, colored by area, each with a hover box
  return L.geoJSON(shapes, { 
    style: f => ({ 
	  color: AREAS[f.properties.area].color, 
	  fillColor: AREAS[f.properties.area].color, 
	  weight: 1.5, 
	  fillOpacity: 0.65
	}), 
	onEachFeature: (f, layer) => { 
	  const list = f.properties.grants; 
	  const first = list[0].properties; 
	  //One line per grant on this parcel, newest first
	  const lines = list 
	    .slice().sort((a, b) => (b.properties.began || 0) - (a.properties.began || 0)) 
		.map(g => { 
		  const p = g.properties; 
		  return `<strong>${p.company}</strong> (${p.began || 'n/a'})<br>
		          ${money(p.grant)} grant &middot; ${money(p.investment)} invested`; 
        }) 
        .join('<br>'); 
      layer.bindTooltip(` 
        <em>${first.address} &middot; ${first.area}</em><br>
        ${lines}
      `, { sticky: true }); 
    }
  }).addTo(map); 
}	
				  
