// Load objects from api
async function getObject(id) {
    const url = "https://collectionapi.metmuseum.org/public/collection/v1/objects/"
    try {
        const response = await fetch(`${url}${id}`)
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log(data);
        return data
    } catch (error) {
        console.log(error)
        return null
    }
}

// updata bootstrap carousel with the apidata
async function updateCarousel(imgIds) {
    var carousel_text = ''
    if (imgIds.length == 0) {
        carousel_text = ""
    }
    else {
        let i = 1
        for (let id of imgIds) {
            var apidata = await getObject(id)
            var objurl = apidata['primaryImage']
            var objtitle = apidata['title']
            var objgallery = apidata['GalleryNumber']
            var artist=apidata['artistDisplayName']
            var date=apidata['objectDate']
            if (apidata) {
                if (i == 1) {
                    carousel_text += `<div class="carousel-item active">
      <img src="${objurl}" class="d-block w-100" alt="...">
      <div class="carousel-caption d-none d-md-block">
        <h5>${objtitle}</h5>
        <p>Available at Gallery # ${objgallery}.</p>
      </div>
    </div>`
                }
                else {
                    carousel_text += `<div class="carousel-item">
      <img src="${objurl}" class="d-block w-100" alt="...">
      <div class="carousel-caption d-none d-md-block">
        <h5>${objtitle}</h5>
        <p>Available at Gallery # ${objgallery}.</p>
      </div>
    </div>`
                }
            }

            i += 1
        }
    }
    carousel.innerHTML = carousel_text

}

// function to randomize arrays
function shuffle(array) {
    let currentIndex = array.length;

    // While there remain elements to shuffle...
    while (currentIndex != 0) {

        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const beginDateSlider = document.getElementById("begin-date");
    const endDateSlider = document.getElementById("end-date");
    const beginDateValue = document.getElementById("begin-date-value");
    const endDateValue = document.getElementById("end-date-value");

    // Update displayed values
    beginDateSlider.addEventListener("input", function () {
        beginDateValue.textContent = this.value;
    });

    endDateSlider.addEventListener("input", function () {
        endDateValue.textContent = this.value;
    });
});

var carousel = document.getElementById('img-carousel')


fetch('./museum.json')
    .then(response => response.json())
    .then(data => {
        // function to calculate the count of objects per country
        function calculateObjectCountByCountry(data) {
            const objectCountByCountry = {};
            data.forEach(item => {
                if (item.country) {
                    objectCountByCountry[item.country] = (objectCountByCountry[item.country] || 0) + 1;
                }
            });
            return objectCountByCountry;
        }

        // get object count by country
        let objectCountByCountry = calculateObjectCountByCountry(data);
        var objectIds = data.map(item => item.id);
        updateCarousel(objectIds.slice(0, 3))

        //document.getElementById("object-ids").innerText = "Object IDs: " + objectIds.join(", ")


        d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson").then(function (geoData) {

            // create  the world map
            var svg = d3.select("#world-map");
            var width = svg.attr("width");
            var height = svg.attr("height");
            svg.attr("viewBox", `0 0 ${width} ${height}`);
            var projection = d3.geoNaturalEarth1().scale(width/6).translate([width/2, height/2]);
            var path = d3.geoPath().projection(projection);

            // tooltip for item count
            var tooltip = d3.select("body").append("div").attr("class", "d3-tooltip").style("position", "absolute").style("pointer-events", "none").style("z-index", "9999");

            // color scale for map
            var colorScale = d3.scaleQuantize()
                .domain([0, d3.max(Object.values(objectCountByCountry)) * 0.001, d3.max(Object.values(objectCountByCountry))])  // Use max value from objectCountByCountry
                .range(d3.schemePuBu[8]);  // Color range

            // no clue how this works:/
            svg.selectAll(".country")
                .data(geoData.features)
                .enter().append("path")
                .attr("class", "country")
                .attr("d", path)
                .attr("fill", function (d) {
                    var countryName = d.properties.name;
                    var count = objectCountByCountry[countryName] || 0;
                    if (count === 0) {
                        return "#f0f0f0";  // color for empty countries
                    }
                    return colorScale(count);  // color according to scale
                })
                .on("click", function (event, d) {
                    var countryName = d.properties.name;
                    if (svg.selectAll(".country.highlighted").size() > 0 && svg.selectAll(".country.highlighted").data()[0].properties.name === countryName) {
                        // reset filter if press country again
                        resetCountryFilter();
                    } else {
                        // filter country on click
                        highlightCountry(countryName);
                        applyFilters();
                    }
                })
                .on("mouseover", function (event, d) {
                    var countryName = d.properties.name;
                    var count = objectCountByCountry[countryName] || 0;
                    tooltip.style("display", "inline-block")
                        .html(`${countryName}: ${count} objects`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 20) + "px");
                })
                .on("mouseout", function () {
                    tooltip.style("display", "none");
                });


            // Highlight the selected country
            function highlightCountry(countryName) {
                svg.selectAll(".country").classed("highlighted", false);
                svg.selectAll(".country")
                    .filter(d => d.properties.name === countryName)
                    .classed("highlighted", true);
            }
            // update object IDs based on filters
            function updateObjectIds(filteredData) {
                var objectIds = filteredData.map(item => item.id);
                //document.getElementById("object-ids").innerText = "Object IDs: " + objectIds.join(", ");
                shuffle(objectIds)
                var imgIds = objectIds
                if (objectIds.length > 3) {
                    imgIds = objectIds.slice(0, 3)
                }
                updateCarousel(imgIds)

            }

            // Reset the country filter and unhighlight the country
            function resetCountryFilter() {
                svg.selectAll(".country").classed("highlighted", false);
                applyFilters();
            }

            // Filter data based on date
            d3.select("#begin-date").on("input", applyFiltersDateInput);
            d3.select("#end-date").on("input", applyFiltersDateInput);
            d3.select("#begin-date").on("change", applyFilters);
            d3.select("#end-date").on("change", applyFilters);

            
            function applyFilters() {
                var beginDate = parseInt(d3.select("#begin-date").property("value"));
                var endDate = parseInt(d3.select("#end-date").property("value"));

                var filteredData = data.filter(item => {
                    var isValidBeginDate = !isNaN(beginDate) && item.beg_date >= beginDate;
                    var isValidEndDate = !isNaN(endDate) && item.end_date <= endDate;
                    return isValidBeginDate && isValidEndDate;
                });

                // Calculate object count based on filtered data
                objectCountByCountry = calculateObjectCountByCountry(filteredData);

                // Update the colors 
                svg.selectAll(".country")
                    .attr("fill", function (d) {
                        var countryName = d.properties.name;
                        var count = objectCountByCountry[countryName] || 0;
                        if (count === 0) {
                            return "#f0f0f0";
                        }
                        return colorScale(count);
                    });

                // Apply country filter after date filter
                var country = d3.select(".country.highlighted").data()[0]?.properties.name;
                if (country) {
                    var countryFilteredData = filteredData.filter(item => item.country === country);
                    updateObjectIds(countryFilteredData);
                } else {
                    updateObjectIds(filteredData);
                }
            }

            function applyFiltersDateInput() {
                var beginDate = parseInt(d3.select("#begin-date").property("value"));
                var endDate = parseInt(d3.select("#end-date").property("value"));

                var filteredData = data.filter(item => {
                    var isValidBeginDate = !isNaN(beginDate) && item.beg_date >= beginDate;
                    var isValidEndDate = !isNaN(endDate) && item.end_date <= endDate;
                    return isValidBeginDate && isValidEndDate;
                });

                // Calculate object count based on filtered data
                objectCountByCountry = calculateObjectCountByCountry(filteredData);

                // Update the colors 
                svg.selectAll(".country")
                    .attr("fill", function (d) {
                        var countryName = d.properties.name;
                        var count = objectCountByCountry[countryName] || 0;
                        if (count === 0) {
                            return "#f0f0f0";
                        }
                        return colorScale(count);
                    });

            }

        });
    })
    .catch(error => console.error("Error loading museum data:", error));
