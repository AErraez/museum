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
        carousel_text = `<div class="carousel-item active">
      <img src="./empty.png" class="d-block w-100" alt="...">
    </div>`
    }
    else {
        let i = 1
        for (let id of imgIds) {
            var apidata = await getObject(id)
            var objurl = quality ? apidata['primaryImage'] : apidata['primaryImageSmall']
            var objtitle = apidata['title']
            var objgallery = apidata['GalleryNumber']
            var artist = apidata['artistDisplayName']
            var date = apidata['objectDate']
            var objcountry = apidata['country']

            var objtext = objcountry ? `, ${objcountry}` : ''
            if (artist) {
                var p2 = `<p>Made By ${artist}. (${date}${objtext})</p>`
            }
            else {
                var p2 = `<p>(${date}${objtext})</p>`
            }

            var p3 = `<p>Currently not in display.</p>`
            if (objgallery) {
                p3 = `<p>Available at Gallery # ${objgallery}.</p>`
            }
            if (apidata) {
                if (i == 1) {
                    carousel_text += `<div class="carousel-item active">
      <img src="${objurl}" class="d-block w-100" alt="...">
      <div class="carousel-caption d-none d-md-block">
        <h5>${objtitle}</h5>
        ${p2}
        ${p3}
      </div>
    </div>`
                }
                else {
                    carousel_text += `<div class="carousel-item">
      <img src="${objurl}" class="d-block w-100" alt="...">
      <div class="carousel-caption d-none d-md-block">
        <h5>${objtitle}</h5>
        ${p2}
        ${p3}
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




const beginDateSlider = document.getElementById("begin-date");
const endDateSlider = document.getElementById("end-date");
const beginDateValue = document.getElementById("begin-date-value");
const endDateValue = document.getElementById("end-date-value");


beginDateSlider.addEventListener("input", function () {
    beginDateValue.textContent = this.value == -550 ? -90000 : this.value;
});

endDateSlider.addEventListener("input", function () {
    endDateValue.textContent = this.value == -550 ? -30000 : this.value;
});


var carousel = document.getElementById('img-carousel')
const objectCount = document.getElementById('obj-count')
const resetBtn = document.getElementById('reset-filters')
const qualitySwitch = document.getElementById('QualitySwitch')
var quality = false
const unknownCount=document.getElementById('unknown-objects')


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

        function calculateObjectCountByType(data) {
            const objectCountByType = {};
            data.forEach(item => {
                if (item.object) {
                    objectCountByType[item.object] = (objectCountByType[item.object] || 0) + 1;
                }
            });
            return objectCountByType;
        }

        // get object count by country
        let objectCountByCountry = calculateObjectCountByCountry(data);
        let objectCountByType = calculateObjectCountByType(data)

        console.log(Object.values(objectCountByType))
        var objectIds = data.map(item => item.id);

        objectCount.innerHTML = objectIds.length.toString()
        unknownCount.innerHTML=`Objects of Unknown Origin: ${objectCountByCountry['Unknown']}`
        shuffle(objectIds)

        var imgIds = objectIds.slice(0, 5)
        updateCarousel(imgIds)

        //document.getElementById("object-ids").innerText = "Object IDs: " + objectIds.join(", ")


        d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson").then(function (geoData) {

            // create  the world map
            var svg = d3.select("#world-map");
            var width = svg.attr("width");
            var height = svg.attr("height");
            svg.attr("viewBox", `0 0 ${width} ${height}`);
            var projection = d3.geoNaturalEarth1().scale(width / 6.5).translate([width / 2, height / 2]);
            var path = d3.geoPath().projection(projection);

            // tooltip for item count
            var tooltip = d3.select("body").append("div").attr("class", "d3-tooltip").style("position", "absolute").style("pointer-events", "none").style("z-index", "9999");

            // color scale for map
            var colorScale = d3.scaleQuantize()
                .domain([0, d3.median(Object.values(objectCountByCountry))*10 , d3.max(Object.values(objectCountByCountry))])  // Use max value from objectCountByCountry
                .range(d3.schemeReds[7]);  // Color range

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
                                svg.selectAll(".country")
            .transition().duration(500)
            .style("opacity", function (d) {
                return d.properties.name === countryName ? 1 : 0.5; // Fade out other countries
            });
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

            // Reset the country filter and unhighlight the country
            function resetCountryFilter() {
                svg.selectAll(".country").classed("highlighted", false);
                svg.transition().duration(500).selectAll(".country").style("opacity", 1)
                applyFilters();
            }


            const categoryColors = d3.scaleOrdinal()
            .domain(["Others", "Ceramics and Glass", "Sculpture and Figures", "Funerary and Religious Objects", "Paintings and Drawings",'Kitchen and Tableware','Furniture and Decoration','Jewelry and Ornaments','Fragments and Pieces','Boxes and Containers','Weapons and Armor','Musical Instruments']) 
            .range(d3.schemeSet3);
        
            function createTreeMap(objectCountByType) {
                const treeSvg = d3.select("#tree-map");
            
                // Get the container's actual dimensions for responsiveness
                const container = treeSvg.node().getBoundingClientRect();
                const width = container.width;
                const height = container.height;
            
                treeSvg.attr("viewBox", `0 0 ${width} ${height}`)
                       .attr("preserveAspectRatio", "xMidYMid meet");
            
                // Convert data into a hierarchical format
                const root = d3.hierarchy({
                    children: Object.entries(objectCountByType).map(([key, value]) => ({ name: key, value }))
                }).sum(d => d.value)
                  .sort((a, b) => b.value - a.value);
            
                // Create a treemap layout
                d3.treemap()
                    .size([width, height])
                    .padding(2)
                    (root);
            
                // Bind data to existing nodes and update positions
                let nodes = treeSvg.selectAll(".node")
                    .data(root.leaves(), d => d.data.name);
            
                // Remove old elements that are no longer needed
                nodes.exit().remove();
            
                // Enter new elements if necessary
                let newNodes = nodes.enter()
                    .append("g")
                    .attr("class", "node");
            
                newNodes.append("rect")
                    .attr("class", "type")
                    .attr("fill", d => categoryColors(d.data.name))
                    .on("mouseover", (event, d) => {
                        tooltip.style("display", "inline-block")
                               .html(`${d.data.name}: ${d.data.value} objects`)
                               .style("left", (event.pageX + 10) + "px")
                               .style("top", (event.pageY - 20) + "px");
                    })
                    .on("mouseout", () => {
                        tooltip.style("display", "none");
                    })
                    .on("click", function (event, d) {
                        var typeName = d.data.name;
                        if (treeSvg.selectAll(".type.highlighted").size() > 0 && treeSvg.selectAll(".type.highlighted").data()[0].data.name === typeName) {
                            d3.selectAll(".type").classed("highlighted", false);
                        } else {
                            d3.selectAll(".type").classed("highlighted", false);
                            d3.select(this).classed("highlighted", true);
                        }
                        applyFilters();
                    });
            
                newNodes.append("text")
                    .attr("class", "node-label")
                    .attr("fill", "black")
                    .style("font-size", "12px")
                    .style("pointer-events", "none");
            
                // Merge and update existing elements
                nodes = newNodes.merge(nodes);
            
                nodes.transition().duration(500)
                .style("opacity", 1)
                .attr("transform", d => `translate(${d.x0},${d.y0})`);
        
            nodes.select("rect")
                .transition().duration(500)
                .attr("width", d => d.x1 - d.x0)
                .attr("height", d => d.y1 - d.y0);
        
                nodes.select(".node-label")
                .transition().duration(500)
                .attr("x", d => (d.x1 - d.x0) / 2)  // Center horizontally
                .attr("y", d => (d.y1 - d.y0) / 2)  // Center vertically
                .attr("text-anchor", "middle")  // Center alignment
                .style("dominant-baseline", "middle")  // Vertical centering
                .style("font-size", d => {
                    let width = d.x1 - d.x0;
                    let height = d.y1 - d.y0;
                    return Math.min(14, width / d.data.name.length * 1.5, height / 2) + "px";
                })
                .text(d => d.data.name)
                .each(function (d) {
                    const bbox = this.getBBox();
                    if (bbox.width > d.x1 - d.x0 - 20 || bbox.height > d.y1 - d.y0 - 10) {
                        d3.select(this).remove();
                    }
                });
            }
            
            createTreeMap(objectCountByType)

            // update object IDs based on filters
            function updateObjectIds(filteredData) {
                var objectIds = filteredData.map(item => item.id);
                objectCount.innerHTML = objectIds.length.toString()
                //document.getElementById("object-ids").innerText = "Object IDs: " + objectIds.join(", ");
                shuffle(objectIds)
                imgIds = objectIds
                if (objectIds.length > 5) {
                    imgIds = objectIds.slice(0, 5)
                }
                updateCarousel(imgIds)

            }



            // Filter data based on date
            d3.select("#begin-date").on("input", applyFiltersDateInput);
            d3.select("#end-date").on("input", applyFiltersDateInput);
            d3.select("#begin-date").on("change", applyFilters);
            d3.select("#end-date").on("change", applyFilters);


            function applyFilters() {
                var beginDate = parseInt(d3.select("#begin-date").property("value"));
                var endDate = parseInt(d3.select("#end-date").property("value"));
                endDate = endDate == -550 ? -30000 : endDate
                beginDate = beginDate == -550 ? -90000 : beginDate

                var filteredData = data.filter(item => {
                    var isValidBeginDate = !isNaN(beginDate) && item.beg_date >= beginDate;
                    var isValidEndDate = !isNaN(endDate) && item.end_date <= endDate;
                    return isValidBeginDate && isValidEndDate;
                });


                // Apply country filter after date filter
                var country = d3.select(".country.highlighted").data()[0]?.properties.name;
                var type = d3.select(".type.highlighted").data()[0]?.data.name

                var countryFilteredData=filteredData
                if (type) {

                    filteredData = filteredData.filter(item => item.object === type);
                } 
                // Calculate object count based on filtered data
               
                if (country) {
                    filteredData = filteredData.filter(item => item.country === country);
                    //countryFilteredData=countryFilteredData.filter(item => item.country === country)
                } 
                
                
                objectCountByType= calculateObjectCountByType(filteredData)
                createTreeMap(objectCountByType)

                objectCountByCountry = calculateObjectCountByCountry(filteredData);
                colorScale = d3.scaleQuantize()
                .domain([0, d3.median(Object.values(objectCountByCountry))*10 , d3.max(Object.values(objectCountByCountry))])  // Use max value from objectCountByCountry
                .range(d3.schemeReds[7]);  // Color range
                unknownCount.innerHTML= objectCountByCountry['Unknown'] ? `Objects of Unknown Origin: ${objectCountByCountry['Unknown']}`:`Objects of Unknown Origin: 0`
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



                updateObjectIds(filteredData);
                
            }

            function applyFiltersDateInput() {
                var beginDate = parseInt(d3.select("#begin-date").property("value"));
                var endDate = parseInt(d3.select("#end-date").property("value"));
                endDate = endDate == -550 ? -30000 : endDate
                beginDate = beginDate == -550 ? -90000 : beginDate

                var filteredData = data.filter(item => {
                    var isValidBeginDate = !isNaN(beginDate) && item.beg_date >= beginDate;
                    var isValidEndDate = !isNaN(endDate) && item.end_date <= endDate;
                    return isValidBeginDate && isValidEndDate;
                });


                // Apply country filter after date filter
                var country = d3.select(".country.highlighted").data()[0]?.properties.name;
                var type = d3.select(".type.highlighted").data()[0]?.data.name

                var countryFilteredData=filteredData
                if (type) {

                    filteredData = filteredData.filter(item => item.object === type);
                } 
                // Calculate object count based on filtered data
               
                if (country) {
                    filteredData = filteredData.filter(item => item.country === country);
                    countryFilteredData=countryFilteredData.filter(item => item.country === country)
                } 
                
                
                objectCountByCountry = calculateObjectCountByCountry(filteredData);
                unknownCount.innerHTML= objectCountByCountry['Unknown'] ? `Objects of Unknown Origin: ${objectCountByCountry['Unknown']}`:`Objects of Unknown Origin: 0`
                colorScale = d3.scaleQuantize()
                .domain([0, d3.median(Object.values(objectCountByCountry))*10 , d3.max(Object.values(objectCountByCountry))])  // Use max value from objectCountByCountry
                .range(d3.schemeReds[7]);  // Color range
                svg.selectAll(".country")
                    .attr("fill", function (d) {
                        var countryName = d.properties.name;
                        var count = objectCountByCountry[countryName] || 0;
                        if (count === 0) {
                            return "#f0f0f0";
                        }
                        return colorScale(count);
                    });


                objectCountByType= calculateObjectCountByType(filteredData)
                createTreeMap(objectCountByType)

                objectCount.innerHTML = filteredData.length.toString()

            }

            

            qualitySwitch.addEventListener('change', () => {
                quality = qualitySwitch.checked
                updateCarousel(imgIds)
            })

            resetBtn.addEventListener('click', () => {
                beginDateSlider.value = -550
                beginDateValue.textContent = -90000
                endDateSlider.value = 2000
                endDateValue.textContent = 2000
                d3.selectAll(".type").classed("highlighted", false)
                resetCountryFilter()
            })

        });
    })
    .catch(error => console.error("Error loading museum data:", error));
