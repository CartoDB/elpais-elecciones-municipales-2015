/*
  Coniguration block
*/

// Fake data?
var isFake = false;
// VizJson to load
var vizJson = 'https://team.cartodb.com/u/piensaenpixel/api/v2/viz/995e0c70-0059-11e5-a962-0e0c41326911/viz.json';
// User at CartoDB to retrieve the data
var sql = new cartodb.SQL({user: 'dcarrion'});
//  Name of the table with the tiweets
var twitterTable = 'elecciones_partidos';
// Aggregation level to retrieve the data
// Valid values are MINUTE, HOUR, DAY, WEEK, MONTH, YEAR
var groupDate = 'HOUR';
//  Name and colors to assign to the parties
var partiesData = {
  '1' : {name : 'PSOE', color : '#CE4039'},
  '2' : {name : 'Partido Popular', color : '#42A4DC'},
  '3' : {name : 'Izquierda Unida', color : '#539147'},
  '4' : {name : 'Ciudadanos', color : '#E08048'},
  '5' : {name : 'Podemos', color : '#4B1E5B'},
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


function createMap(verticalBar,chart){
  cartodb.createVis('map', vizJson, {title: false })
    .done(function(vis, layers) {
      basemap = layers[0];
      basemap.setUrl(baseLayer);
      layers[1]
        .on('change:time', function(changes) {
          //update the vertical bar
          if (verticalBar && chart){
            var x =  chart.xAxis.scale()(new Date(changes.time)) + barOffset;
            if (x > 0 && x < chart.xAxis.range()[1]){
              verticalBar.attr("x1",x).attr("x2",x);
            }
          }
      });
  })
  .error(logErrors);
}



$( document ).ready(function() {
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
