$.ajax({
    url: 'https://script.google.com/macros/s/AKfycbwde4vwt0l4_-qOFK_gL2KbVAdy7iag3BID8NWu2DQ1566kJlqyAS1Y/exec?spreadsheetId=1JSmJtYkYrEx6Am5drhSet17qwJzOKDI7tE7FxPx4YNI&sheetName=New%20World',
    type: 'GET',
    success: (res) => {
        let towns = JSON.parse(res);
        for (const town of towns) {
            let rawCoords = town['Town Hall Coordinates (NO COMMAS PLEASE)'].split(' ');
            for(let i in rawCoords) {
                rawCoords[i] = parseInt(rawCoords[i])
            }
            console.log(`Mapping town ${town.Name}, coords ${rawCoords}`)
            if (isNaN(rawCoords[0]) || isNaN(rawCoords[2])) {
                console.log(`Not displaying town ${town.Name}: invalid coordinates`)
            } else {
                let coords = mapcoord([rawCoords[0], rawCoords[2]]);
                L.marker(coords).addTo(map)
                    .bindPopup(`Name: ${town.Name}<br>Mayor: ${town.Mayor}<br>Rank: ${town['Town Rank']}`)
            }

        }
    }
})