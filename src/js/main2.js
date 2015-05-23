/*
  Coniguration block
*/

// Fake data?
var isFake = false;
// VizJson to load
var vizJson = 'viz.json';
// User at CartoDB to retrieve the data
var sql = new cartodb.SQL({user: 'dcarrion'});
//  Name of the table with the tiweets
var twitterTable = 'elecciones_partidos';
// Aggregation level to retrieve the data
// Valid values are MINUTE, HOUR, DAY, WEEK, MONTH, YEAR
var groupDate = 'HOUR';
//  Name and colors to assign to the parties
var partiesData = {
  '1' : {name : 'Partido Popular', color : '#42A4DC'},
  '2' : {name : 'PSOE', color : '#CE4039'},
  '3' : {name : 'Podemos', color : '#4B1E5B'},
  '4' : {name : 'Ciudadanos', color : '#E08048'},
  '5' : {name : 'Izquierda Unida', color : '#539147'},
  '6' : {name : 'Union Progreso y Democracia', color : '#c3007f'}
};
// Selector at the HTML to load the graph
var selector = '.graph';
// Adjust the verticalBar to the Torque animation (hack)
var barOffset = 0;

/*
  End of the configuration block
*/

var baseLayer = 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
var basemap;
var torqueLayer;

function main() {
  var sqlStm = 'SELECT COUNT(*) counts, date_trunc(\'{{groupDate}}\',postedtime) date, category_name cat FROM '
      + twitterTable + ' GROUP BY 2,3 ORDER BY 2,3 ASC';

  sql.execute(sqlStm,{groupDate : groupDate})
    .done(function(twitterData){
      var lineClasses = [];
      Object.keys(partiesData).forEach(function(catName){
        lineClasses.push(
          lineData(
            catName,
            twitterData.rows.filter(function(twiterRow){
              return twiterRow.cat == catName
            })
          )
        );
      });
      // ready to call the graph constructor
      createGraph(lineClasses);
    })
  .error(logErrors);
}

function logErrors(errors){
  console.log(errors);
}

function lineData(catName, twitterData){
  var values = [];
  twitterData.forEach(function(twitt){
    //var date = +d3.time.format.iso.parse(twitt.date);
    var date = new Date(twitt.date);
    var y = twitt.counts;
    if (isFake){
      y = y + Math.floor(y*Math.random() * Math.floor((Math.random()*2-1)));
    }
    values.push({x : date, y : y });
  });
  return {
    key    : partiesData[catName].name,
    color  : partiesData[catName].color,
    values : values,
    area   : true
  }
};

/*
 NDV3 code to generate line and bar graphs
*/

function createGraph(lineClasses){
    nv.addGraph(function() {

    var chart = nv.models.lineChart()
      .margin({left: 0, right: 0, top: 0, bottom: 0})  // Adjust chart margins to give the x-axis some breathing room.
      .interactive(false)
      .showLegend(false)
      .showYAxis(false)
      /* We need to have an X axis rendered (even if we hide it with CSS in order to have
         a proper xAxis range() and domain() pairs so we can position the verticalBar*/
      .showXAxis(true)
      .interpolate('basis')
      ;

    d3.select(selector)
          .append('svg')    //Select the <svg> element you want to render the chart in.
          .datum(lineClasses)         //Populate the <svg> element with chart data...
          .call(chart);      //Finally, render the chart!

    //initialize a vertical bar on the chart that will indicate current time
    var verticalBar = d3.select('svg')
      .append("line")
      .attr("x1", chart.margin().left)
      .attr("y1", chart.margin().top-5)
      .attr("x2", chart.margin().left)
      .attr("y2", 80)
      .attr("class","verticalLine");

    //Update the chart when window resizes.
    nv.utils.windowResize(function() { chart.update() });

    createMap(verticalBar,chart);
    return chart;
  });
}; // Create Graph

var map = L.map('map', {
    zoomControl: false,
    center: [43, 0],
    zoom: 3
});

basemap = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
});
basemap.addTo(map);


function createMap(verticalBar,chart){

  cartodb.createLayer(map, {
      type: "torque",
      options: {
          query: "select * from elecciones_partidos WHERE category_name IN (1,2,3,4,5,6)",
          user_name: "dcarrion",
          table_name: twitterTable,
          cartocss: $("#cartocss").html()
      }
  }).addTo(map)
  .done(function(layer) {
      torqueLayer = layer;

      layer
        .on('change:time', function(changes) {
          //update the vertical bar
          if (verticalBar && chart){
            var x =  chart.xAxis.scale()(new Date(changes.time)) + barOffset;
            if (x > 0 && x < chart.xAxis.range()[1]){
              verticalBar.attr("x1",x).attr("x2",x);
            }
          }
        })
        .on("loading", function() {
          console.log("layer about to load");
        })
        .on("load",function(){
          console.log("layer loaded");
        });
  });
}



$( document ).ready(function() {
  var sqlBase = 'select * from elecciones_partidos';

  $("input[name='partido']").change(function(){
      var categories = [];
      $.each($("input[name='partido']:not(:checked)"), function(){
          categories.push({name: $(this).attr("id"), category: $(this).val()});
      });

      var newCSS = categories.map(function(c){
        var val = '[value=' + c.category+ ']';
        return '#elecciones_partidos' + val + '{marker-opacity: 0}' +
               '#elecciones_partidos::point2' + val + '{marker-fill-opacity: 0}' +
               '#elecciones_partidos::point3' + val + '{marker-line-opacity: 0}';
        }).join('\r\n');

      if (newCSS) {
          console.log(newCSS);
          torqueLayer.setCartoCSS($("#cartocss").html() + newCSS)
      } else {
          console.log("EEE");
          torqueLayer.setCartoCSS($("#cartocss").html());
      }
  });

  // Base layer switcher
  $( "#white" ).click(function() {
    var baseLayer = 'http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
    basemap.setUrl(baseLayer);
    $( '.tabs > li a' ).toggleClass( "is-active" );
  });
  $( "#dark" ).click(function() {
    var baseLayer = 'http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
    basemap.setUrl(baseLayer);
    $( '.tabs > li a' ).toggleClass( "is-active" );
  });

  main();
});
