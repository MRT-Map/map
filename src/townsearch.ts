import L from "leaflet";
import { resetOffset } from "./ui";
import { mapcoord } from "./utils";
import { mapLayers } from "./map-cities";
import { g, gcm } from "./globals";
import $ from "jquery";

interface Member {
  Username: string | number;
  "Former Usernames": string;
  "Temporary Usernames": string;
  names?: (string | number)[];
}

let MRTMembers: Member[];

export async function initTownSearch() {
  // get MRT members
  const res = await fetch(
    "https://script.google.com/macros/s/AKfycbwde4vwt0l4_-qOFK_gL2KbVAdy7iag3BID8NWu2DQ1566kJlqyAS1Y/exec?spreadsheetId=1Hhj_Cghfhfs8Xh5v5gt65kGc4mDW0sC5GWULKidOBW8&sheetName=Members"
  );
  MRTMembers = (await res.json()) as Member[];
  //make a new property, which is an array of all the user's names
  for (const member of MRTMembers) {
    //make new property and add current username
    member.names = [member.Username];
    if (member["Former Usernames"] == "") {
      //do nothing more
    } else {
      //split former usernames into an array
      const formerUsernames = member["Former Usernames"].split(",");
      //add former usernames to array
      for (const formerUsername of formerUsernames) {
        member.names.push(formerUsername.trim());
      }
    }
    if (member["Temporary Usernames"] == "") {
      //do nothing more
    } else {
      //split temp usernames into an array
      const tempUsernames = member["Temporary Usernames"].split(",");
      //add temp usernames to array
      for (const tempUsername of tempUsernames) {
        member.names.push(tempUsername.trim());
      }
    }
  }
}

function townSearch(query: string) {
  const map = g().map;

  //hide CC
  map.removeLayer(gcm().CC);
  //hide old search
  map.removeLayer(gcm().searchLayer);
  //redefine feature group
  gcm().searchLayer =
    L.featureGroup() as L.FeatureGroup<L.Marker>;
  //tell other functions not to display towns
  window.globals.displayTowns = false;
  //get members with names (including old names) matching query
  const relevantNames: string[] = [];
  for (const member of MRTMembers) {
    for (let name of member.names!) {
      //deal with names that aren't strings
      if (typeof name != "string") {
        name = name.toString();
      }
      name = name.toLowerCase();
      if (name.toLowerCase().includes(query.toLowerCase())) {
        relevantNames.push(name);
      }
    }
  }
  //filter towns by search query
  const relevantTowns = window.globals.cityMap.towns.filter(
    (t) =>
      t.Name?.toString().toLowerCase().includes(query.toLowerCase()) ??
      relevantNames.includes(t.Mayor.toString().toLowerCase())
  );
  //remove other markers from map
  for (const layer of window.globals.cityMap.cityLayers.values()) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    map.removeLayer(layer);
  }
  for (const town of relevantTowns) {
    //parse Coords
    const rawCoords = [town.X, town.Y, town.Z];

    //do not map if invalid coords
    if (isNaN(rawCoords[0]) || isNaN(rawCoords[2])) {
      console.log(
        `Not displaying town ${town.Name} in search results popup: invalid or missing coordinates`
      );
    } else {
      //console.log(`Showing ${town.Name}`)
      gcm().searchLayer.addLayer(
        L.marker(mapcoord([rawCoords[0], rawCoords[2]]))
          .addTo(map)
          .bindPopup(
            `Name: ${town.Name}<br>Mayor: ${town.Mayor}<br>Deputy Mayor: ${
              town["Deputy Mayor"]
            }<br>Rank: ${
              town["Town Rank"]
            }<br><a href="https://mrtrapidroute.com?from=Current+Location&to=${encodeURIComponent(
              town.Name!
            )}" target="_blank">Navigate to here with RapidRoute</a>`
          )
      );
    }
  }
  map.addLayer(gcm().searchLayer);
  return relevantTowns;
}

function startSearch() {
  try {
    resetOffset();
  } catch {
    console.log("couldn't reset results");
  }
  const value = $("#search__input").val() as string | null;
  //console.log(value)
  if (value == null || value == "") {
    $(".results__container").css("display", "none");
    window.globals.displayTowns = true;
    mapLayers();
    document.getElementById("search__results")!.innerHTML = "";
  } else {
    $(".results__container").css("display", "block");
    const results = townSearch(value);
    document.getElementById("search__results")!.innerHTML = "";
    if (results.length == 0) {
      document.getElementById("search__results")!.innerHTML =
        "<div>No Results</div>";
    }
    for (const result of results) {
      const ele = document.getElementById(
        "search__results"
      )!;
      ele.innerHTML += `<div class="result"><div class="result__name">${
        result.Name
      }</div><div class="result__details"><div class="result__rank">Rank: ${
        result["Town Rank"]
      }</div><div class="result__mayor">Mayor: ${
        result.Mayor
      }</div></div></div>`;
      ele.querySelector("div")!.onclick = () => focusMap(result.X, result.Z)
    }
  }
}

function hideKeyboard() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const activeElement = document.activeElement as HTMLInputElement | null;
  activeElement?.blur();
  $("input").blur();
}

declare global {
  export interface Window {
    opera?: string;
  }
}

function mobileCheck() {
  let check = false;
  // prettier-ignore
  // eslint-disable-next-line
  (function(a: string | undefined){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a!)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a!.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
}

let searchTimer: NodeJS.Timeout;

$("#search__input").on("input", function () {
  $(".results__container").css("display", "none");
  const value = $("#search__input").val();
  if (!mobileCheck() || value == null || value == "") {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      startSearch();
    }, 500);
  }
});

$("#search__input").keypress(function (e) {
  if (e.which == 13) {
    hideKeyboard();
    startSearch();
  }
});

$(".search__bar button").click(function () {
  hideKeyboard();
  startSearch();
});

export function focusMap(x: number, z: number) {
  if (isNaN(x) || isNaN(z))
    return alert(
      "This town cannot be displayed because it contains invalid coordinates. Please contact a staff member to fix."
    );

  console.log(x, z)
  g().map.flyTo(mapcoord([x, z]), 5);
}
