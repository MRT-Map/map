var MRTMembers;
//get MRT members
$.ajax({
  url: 'https://script.google.com/macros/s/AKfycbwde4vwt0l4_-qOFK_gL2KbVAdy7iag3BID8NWu2DQ1566kJlqyAS1Y/exec?spreadsheetId=1Hhj_Cghfhfs8Xh5v5gt65kGc4mDW0sC5GWULKidOBW8&sheetName=Members',
  type: 'GET',
  success: (res) => {
    //add members to object
    MRTMembers = JSON.parse(res)
    //make a new property, which is an array of all the user's names
    for (let member in MRTMembers) {
      //make new property and add current username
      MRTMembers[member].names = [MRTMembers[member].Username]
      if (MRTMembers[member]["Former Usernames"] == '') {
        //do nothing more
      } else {
        //split former usernames into an array
        let formerUsernames = MRTMembers[member]["Former Usernames"].split(',')
        //add former usernames to array
        for (const formerUsername of formerUsernames) {
          MRTMembers[member].names.push(formerUsername.trim())
        }
      }
      if (MRTMembers[member]["Temporary Usernames"] == '') {
        //do nothing more
      } else {
        //split temp usernames into an array
        let tempUsernames = MRTMembers[member]["Temporary Usernames"].split(',')
        //add temp usernames to array
        for (const tempUsername of tempUsernames) {
          MRTMembers[member].names.push(tempUsername.trim())
        }
      }

    }
  }
})

function townSearch(query) {
  //hide CC
  map.removeLayer(CC)
  //hide old search
  map.removeLayer(searchLayer);
  //redefine feature group
  searchLayer = new L.featureGroup()
  //tell other functions not to display towns
  displayTowns = false;
  //get members with names (including old names) matching query
  var relevantNames = [];
  for (const member of MRTMembers) {
    for (let name in member.names) {
      //deal with names that aren't strings
      if (typeof member.names[name] != 'string') {
        member.names[name] = member.names[name].toString()
      }
      member.names[name] = member.names[name].toLowerCase()
      if (member.names[name].toLowerCase().includes(query.toLowerCase())) {
        relevantNames.push(...member.names);
      }
    }
  }
  //filter towns by search query
  const relevantTowns = towns.filter(t => t.Name.toString().toLowerCase().includes(query.toLowerCase()) || relevantNames.includes(t.Mayor.toString().toLowerCase()));
  //remove other markers from map
  for (let layer in cityLayers) {
    map.removeLayer(cityLayers[layer])
  }
  for (const town of relevantTowns) {
    //parse Coords
    let rawCoords = town['Town Hall Coordinates (NO COMMAS PLEASE)'].split(' ');
    //convert all numbers to int
    for (let i in rawCoords) {
      rawCoords[i] = parseInt(rawCoords[i])
    }
    //do not map if invalid coords
    if (isNaN(rawCoords[0]) || isNaN(rawCoords[2])) {
      console.log(`Not displaying town ${town.Name} in search results popup: invalid or missing coordinates`)
    } else {
      //console.log(`Showing ${town.Name}`)
      searchLayer.addLayer(
        L.marker(mapcoord([rawCoords[0], rawCoords[2]])).addTo(map)
          .bindPopup(`Name: ${town.Name}<br>Mayor: ${town.Mayor}<br>Deputy Mayor: ${town['Deputy Mayor']}<br>Rank: ${town['Town Rank']}`)
      )
    }
  }
  map.addLayer(searchLayer)
  return relevantTowns;
}

var searchTimer;

$("#search__input").on("input", function () {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function(){
    console.log("searching");
    let value = $("#search__input").val()
    //console.log(value)
    if (value == null || value == "") {
      displayTowns = true;
      mapLayers()
      document.getElementById("search__results").innerHTML = "";
    } else {
      let results = townSearch(value)
      document.getElementById("search__results").innerHTML = "";
      for(const result of results) {
        document.getElementById("search__results").innerHTML += `<div class="result"><div class="result__name">${result.Name}</div><div class="result__details"><div class="result__rank">Rank: ${result["Town Rank"]}</div><div class="result__mayor">Mayor: ${result.Mayor}</div></div></div>`;
      }
    }
  }, 500)
})
