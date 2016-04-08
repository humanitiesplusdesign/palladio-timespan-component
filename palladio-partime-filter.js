// Palladio template component module

angular.module('palladioTimespanComponent', ['palladio', 'palladio.services'])
	.run(['componentService', function(componentService) {
		var compileStringFunction = function (newScope, options) {

			// Options
			//		showControls: true
			//		showAccordion: true
			//		showSettings: true
			//		fullWidth: false
			//		fullHeight: false
			//		view: false

			newScope.showControls = newScope.showControls === undefined ? true : newScope.showControls;
			newScope.showAccordion = newScope.showAccordion === undefined ? true : newScope.showAccordion;
			newScope.showSettings = newScope.showSettings === undefined ? true : newScope.showSettings;
			newScope.fullWidth = newScope.fullWidth === undefined ? false : newScope.fullWidth;
			newScope.fullHeight = newScope.fullHeight === undefined ? false : newScope.fullHeight;
			newScope.view = newScope.view === undefined ? false : newScope.view;
			newScope.functions = {};

			var compileString = '<div data-palladio-partime-filter ';

			compileString += 'show-controls=showControls ';
			compileString += 'show-accordion=showAccordion ';
			compileString += 'show-settings=showSettings ';
			compileString += 'full-width=fullWidth ';
			compileString += 'full-height=fullHeight ';
			compileString += 'functions=functions ';
			compileString += 'view=view ';

			compileString += '></div>';

			return compileString;
		};

		componentService.register('timespan', compileStringFunction);
	}])
	.directive('palladioPartimeFilter', ['dateService', 'palladioService', 'dataService', 'filterService',
		function (dateService, palladioService, dataService, filterService) {

		var directiveObj = {
			scope: {
				fullHeight: '=',
				fullWidth: '=',
				showControls: '=',
				showAccordion: '=',
				showSettings: '=',
				view: '=',
				functions: '='
			},
			templateUrl: 'partials/palladio-timespan-component/template.html',

			link: { pre: function(scope) {

					// In the pre-linking function we can use scope.data, scope.metadata, and
					// scope.xfilter to populate any additional scope values required by the
					// template.

					// The parent scope must include the following:
					//   scope.xfilter
					//   scope.metadata

					// If you need to do any configuration before your visualization is set up,
					// do it here. DO NOT do anything that changes the DOM here, so don't
					// programatically instantiate your visualization at this point. That happens
					// in the 'post' function.
					//
					// You might need to do things here especially
					// if your visualization is contained in another directive that is included
					// in the template of this directive.

					scope.uniqueToggleId = "partimeFilter" + Math.floor(Math.random() * 10000);
					scope.uniqueToggleHref = "#" + scope.uniqueToggleId;
					scope.uniqueModalId = scope.uniqueToggleId + "modal";

					scope.metadata = dataService.getDataSync().metadata;
					scope.xfilter = dataService.getDataSync().xfilter;

					// Take the first number dimension we find.
					scope.dateDims = scope.metadata.filter(function (d) { return d.type === 'date'; });
					scope.dateStartDim = scope.dateDims[0];
					scope.dateEndDim = scope.dateDims[1] ? scope.dateDims[1] : scope.dateDims[0];

					// Label dimensions.
					scope.labelDims = scope.metadata;
					scope.tooltipLabelDim = scope.labelDims[0];
					scope.groupDim = scope.labelDims[0];

					scope.title = "Time Span Filter";

					scope.stepModes = ['Bars', 'Parallel', 'Grouped Bars'];
					scope.stepMode = scope.stepModes[0];

					// Handle collapsing
					scope.collapse = false;
					scope.toggleCollapse = function() {
						scope.collapse = !scope.collapse;
					};

					scope.showDateStartModal = function () {
						$('#' + scope.uniqueModalId).find('#date-start-modal').modal('show');
					};

					scope.showDateEndModal = function () {
						$('#' + scope.uniqueModalId).find('#date-end-modal').modal('show');
					};

					scope.showTooltipLabelModal = function () {
						$('#' + scope.uniqueModalId).find('#tooltip-label-modal').modal('show');
					};

					scope.showGroupModal = function () {
						$('#' + scope.uniqueModalId).find('#group-modal').modal('show');
					};

					if(scope.functions) {
						scope.functions["startDimension"] = function(dim) {
							scope.$apply(function(s) {
								s.dateStartDim = s.dateDims.filter(function(f) { return f.key === dim.key; })[0];
							});
						};
						scope.functions["endDimension"] = function(dim) {
							scope.$apply(function(s) {
								s.dateEndDim = s.dateDims.filter(function(f) { return f.key === dim.key; })[0];
							});
						};
						scope.functions["tooltipDimension"] = function(dim) {
							scope.$apply(function(s) {
								s.tooltipLabelDim = s.labelDims.filter(function(f) { return f.key === dim.key; })[0];
							});
						};
						scope.functions["groupDimension"] = function(dim) {
							scope.$apply(function(s) {
								s.groupDim = s.labelDims.filter(function(f) { return f.key === dim.key; })[0];
							});
						};
					}

				}, post: function(scope, element) {

					// If you are building a d3.js visualization, you can grab the containing
					// element with:
					//
					// d3.select(element[0]);

					var sel, svg, dim, group, x, y, xStart, xEnd, emitFilterText, removeFilterText,
						topBrush, midBrush, bottomBrush, top, bottom, middle, filter, yStep, tooltip,
						xAxisStart, xAxisEnd, pathData;

					var strokeWidth = 0.8;
					var highlightStrokeWidth = 1.5;
					var r = 1;
					var highlightR = 2;

					var highlightIn = function(d) {
						svg.select('g').selectAll('.path')
								.filter(function(p) { return p.key.slice(0,3).join() === d.key.slice(0,3).join(); })
								.selectAll("*")
							.attr('stroke', '#222222')
							// .attr('r', highlightR)
							.attr('stroke-width', highlightStrokeWidth);
					};
					var highlightOut = function(d) {
						svg.select('g').selectAll('.path')
								.filter(function(p) { return p.key.slice(0,3).join() === d.key.slice(0,3).join(); })
								.selectAll("*")
							.attr('stroke', fill)
							// .attr('r', r)
							.attr('stroke-width', strokeWidth);
					};

					var format = dateService.format;

					// ng-class is not compiled before directive post-compile function (really!)
					// So we apply width classes manually...
					element.find('.main-viz').parent().addClass(scope.showSettings ? 'col-lg-9' : 'col-lg-12');
					element.find('.main-viz').parent().addClass(scope.showSettings ? 'col-md-8' : 'col-md-12');

					// Constants...
					var margin = 25;
					var width = scope.fullWidth ? element.find('.main-viz').width() - margin*2 : element.find('.main-viz').width();
					var height = scope.height ? +scope.height : 270;
					height = scope.fullHeight ? $(window).height()-200 : height;
					var filterColor = '#9DBCE4';

					function setup() {
						sel = d3.select(d3.select(element[0]).select(".main-viz")[0][0].children[0]);
						if(!sel.select('svg').empty()) sel.select('svg').remove();
						svg = sel.append('svg');

						sel.attr('width', width + margin*2);
						sel.attr('height', height + margin*2);

						svg.attr('width', width + margin*2);
						svg.attr('height', height + margin*2);

						// Pre-initialize the brushes - for load/save consistency.
						topBrush = d3.svg.brush();
						bottomBrush = d3.svg.brush();
						midBrush = d3.svg.brush();

						if(scope.dateStartDim && scope.dateEndDim && scope.tooltipLabelDim && scope.groupDim) {

							if(dim) dim.remove();

							// Dimension has structure [startDate, endDate, label, group]
							dim = scope.xfilter.dimension(
								function(d) {
									if((format.reformatExternal(d[scope.dateStartDim.key]) !== '' &&
										format.reformatExternal(d[scope.dateEndDim.key]) !== '') ||
										format.reformatExternal(d[scope.dateStartDim.key]) ===
										format.reformatExternal(d[scope.dateEndDim.key]) ) {
											// Both populated OR both equal (i.e. blank)
											return [ format.reformatExternal(d[scope.dateStartDim.key]),
													format.reformatExternal(d[scope.dateEndDim.key]),
													d[scope.tooltipLabelDim.key],
													d[scope.groupDim.key] ];
									} else {
										// Otherwise set the blank one equal to the populated one.
										if(format.reformatExternal(d[scope.dateStartDim.key]) === '') {
											return [ format.reformatExternal(d[scope.dateEndDim.key]),
													format.reformatExternal(d[scope.dateEndDim.key]),
													d[scope.tooltipLabelDim.key],
													d[scope.groupDim.key] ];
										} else {
											return [ format.reformatExternal(d[scope.dateStartDim.key]),
													format.reformatExternal(d[scope.dateStartDim.key]),
													d[scope.tooltipLabelDim.key],
													d[scope.groupDim.key] ];
										}
									}
								}
							);

							// For now we keep the grouping simple and just do a naive count. To enable
							// 'countBy' functionality we need to use the Crossfilter helpers or Reductio.
							group = dim.group();

							setScales();

							xAxisStart = d3.svg.axis().orient("bottom")
									.scale(x);
							xAxisEnd = d3.svg.axis().orient("top")
									.scale(x);

							var topExtent = [];
							var bottomExtent = [];
							var midExtent = [];

							filter = function(d) {
								return (topExtent.length === 0 ||
										(topExtent[0] <= format.parse(d[1]) && format.parse(d[1]) <= topExtent[1])) &&
									(bottomExtent.length === 0 ||
										(bottomExtent[0] <= format.parse(d[0]) && format.parse(d[0]) <= bottomExtent[1])) &&
									(midExtent.length === 0 ||
										(!(midExtent[0] > format.parse(d[0]) && midExtent[0] > format.parse(d[1])) &&
											!(midExtent[1] < format.parse(d[0]) && midExtent[1] < format.parse(d[1]))));
							};

							emitFilterText = function() {
								var texts = [];

								if(bottomExtent.length) {
									texts.push(scope.dateStartDim.description + " from " + format(bottomExtent[0]) + " to " + format(bottomExtent[1]));
								}
								if(midExtent.length) {
									texts.push("between " + format(midExtent[0]) + " and  " + format(midExtent[1]));
								}
								if(topExtent.length) {
									texts.push(scope.dateEndDim.description + " from " + format(topExtent[0]) + " to " + format(topExtent[1]));
								}

								if(texts.length) {
									deregister.push(palladioService.setFilter(scope.uniqueToggleId, scope.title, texts.join(", "), scope.filterReset));
									palladioService.update();
								} else {
									removeFilterText();
								}
							};

							removeFilterText = function() {
								palladioService.removeFilter(scope.uniqueToggleId);
								palladioService.update();
							};

							var filterFunction = function () {};

							// Brush on end date
							topBrush = d3.svg.brush()
								.x(xEnd);
							topBrush.on('brush', function () {
								topExtent = topBrush.empty() ? [] : topBrush.extent();
								filterFunction = function(d) {
									d.filterFunction(filter);
								};
								filterService.filter(dim, filterFunction);
								palladioService.update();
							});
							topBrush.on('brushend', function () {
								emitFilterText();
							});

							// Brush on start date
							bottomBrush = d3.svg.brush()
								.x(xStart);
							bottomBrush.on('brush', function () {
								bottomExtent = bottomBrush.empty() ? [] : bottomBrush.extent();
								filterFunction = function(d) {
									d.filterFunction(filter);
								};
								filterService.filter(dim, filterFunction);
								palladioService.update();
							});
							bottomBrush.on('brushend', function () {
								emitFilterText();
							});

							// Brush to select current events
							midBrush = d3.svg.brush()
								.x(x);
							midBrush.on('brush', function () {
								midExtent = midBrush.empty() ? [] : midBrush.extent();
								filterFunction = function(d) {
									d.filterFunction(filter);
								};
								filterService.filter(dim, filterFunction);
								palladioService.update();
							});
							midBrush.on('brushend', function () {
								emitFilterText();
							});

							// Build the visualization.


							var g = svg.append('g')
									.attr("transform", "translate(" + 10 + "," + margin + ")");

							bottom = g.append('g')
								.attr("class", "axis x-axis")
								.attr("transform", "translate(" + 0 + "," + (height) + ")")
								.call(bottomBrush)
								.call(xAxisStart);

							bottom.selectAll('rect').attr('height', margin);

							top = g.append('g')
								.attr("class", "axis x-axis")
								.call(topBrush)
								.call(xAxisEnd);

							top.selectAll('rect')
								.attr('height', margin)
								.attr('transform', "translate(0,-" + margin +")");

							middle = g.append('g')
								.attr("transform", "translate(" + 0 + "," + (margin + 0.5) + ")")
								.call(midBrush);

							middle.selectAll('rect')
								.attr('height', height - 1)
								.attr('transform', "translate(0,-" + margin + ")");

							g.selectAll('.extent')
								.attr('fill', filterColor)
								.attr('opacity', 0.6);

							tooltip = g.select(".timespan-tooltip");
							// Set up the tooltip.
							if(tooltip.empty()) {
								tooltip = g.append("g")
										.attr("class", "timespan-tooltip")
										.attr("pointer-events", "none")
										.style("display", "none");

								tooltip.append("foreignObject")
										.attr("width", 100)
										.attr("height", 26)
										.attr("pointer-events", "none")
									.append("html")
										.style("background-color", "rgba(0,0,0,0)")
									.append("div")
										.style("padding-left", 3)
										.style("padding-right", 3)
										.style("text-align", "center")
										.style("white-space", "nowrap")
										.style("overflow", "hidden")
										.style("text-overflow", "ellipsis")
										.style("border-radius", "5px")
										.style("background-color", "white")
										.style("border", "3px solid grey");
							}
						}
					}

					function setScales() {
						buildPathData();

						var startValues = group.all().map(function (d) { return d.key[0]; })
								// Check for invalid dates
								.filter(function (d) { return format.parse(d).valueOf(); });
						var endValues = group.all().map(function (d) { return d.key[1]; })
								// Check for invalid dates
								.filter(function (d) { return format.parse(d).valueOf(); });
						var allValues = startValues.concat(endValues).map(function(d) { return format.parse(d); });

						// Scales
						x = d3.time.scale().range([0, width])
								.domain([ d3.min(allValues), d3.max(allValues) ]);
						xStart = d3.time.scale().range([0, width])
								.domain([ d3.min(allValues), d3.max(allValues) ]);
						xEnd = d3.time.scale().range([0, width])
								.domain([ d3.min(allValues), d3.max(allValues) ]);
						y = d3.scale.linear().range([height, 0])
								.domain([0, 1]);
						yStep = d3.scale.linear().range([height, 0])
								.domain([-1, pathData.length]);
					}

					function reApplyAxes() {
						topBrush.x(xEnd);
						bottomBrush.x(xStart);
						midBrush.x(x);
						bottom.call(bottomBrush)
							.call(xAxisStart);
						top.call(topBrush)
							.call(xAxisEnd);
						middle.call(midBrush);
					}

					function fill(d) {
						return filter(d.key) ? "#555555" : "#CCCCCC";
					}

					function buildPathData() {
						pathData = group.top(Infinity)
							.filter(function (d) {
								// Require start OR end date.
								return (d.key[0] !== "" || d.key[1] !== "") && d.value !== 0;
							}).sort(function (a, b) {
								if(scope.stepMode !== 'Grouped Bars' || a.key[3] === b.key[3]) {
									return a.key[0] < b.key[0] ? -1 : 1;
								} else {
									return a.key[3] < b.key[3] ? -1 : 1;
								}
							});

						// Build duplicate lookup array.
						var pathLookup = pathData.map(function(d) { return d.key.slice(0,3).join(); });
						pathData = pathData.filter(function(d) {
							return scope.stepMode !== 'Grouped Bars' ? pathLookup.indexOf(d.key.slice(0,3).join()) === pathLookup.lastIndexOf(d.key.slice(0,3).join()) : true;
						});
					}

					function update() {
						if(svg && scope.dateStartDim && scope.dateEndDim && scope.tooltipLabelDim && scope.groupDim) {

							setScales();
							reApplyAxes();

							var paths = svg.select('g').selectAll('.path')
								.data(pathData,
									function (d) { return d.key[0] + " - " + d.key[1] + " - " + d.key[3]; });

							paths.exit().remove();
							var newPaths = paths.enter()
									.append('g')
										.attr('class', 'path');

							newPaths
								.tooltip(function (d){
									return {
										text : d.key[2] + " (" + d.key[3] + ")" + ": " + d.key[0] + " - " + d.key[1],
										displacement : [0,20],
										position: [0,0],
										gravity: "right",
										placement: "mouse",
										mousemove : true
									};
								});

							newPaths
									.append('circle')
										.attr('class', 'path-start')
										.attr('r', r)
										.attr('fill-opacity', 0.8)
										.attr('stroke-opacity', 0.8)
										.attr('stroke-width', strokeWidth)
										.style("display", "none")
										.on('mouseover', highlightIn)
										.on('mouseout', highlightOut);

							newPaths
									.append('circle')
										.attr('class', 'path-end')
										.attr('r', r)
										.attr('fill-opacity', 0.8)
										.attr('stroke-opacity', 0.8)
										.attr('stroke-width', strokeWidth)
										.style("display", "none")
										.on('mouseover', highlightIn)
										.on('mouseout', highlightOut);

							newPaths
									.append('line')
										.attr('stroke-width', 1)
										.attr('stroke-opacity', strokeWidth)
										.on('mouseover', highlightIn)
										.on('mouseout', highlightOut);

							var lines = paths.selectAll('line');
							var circles = paths.selectAll('circle');
							var startCircles = paths.selectAll('.path-start');
							var endCircles = paths.selectAll('.path-end');

							if(scope.stepMode === "Bars" || scope.stepMode === 'Grouped Bars') {
								// We need to refigure the yStep scale since the number of groups can change.
								yStep.domain([-1, pathData.length]);

								// Calculate fille based on selection.
								lines.attr('stroke', fill);
								circles.attr('stroke', fill);
								circles.attr('fill', fill);

								lines
									.transition()
										.attr('x1', function (d) { return x(format.parse(d.key[0])); } )
										.attr('y1', 0)
										.attr('x2', function (d) { return x(format.parse(d.key[1])); })
										.attr('y2', 0);

								startCircles.attr('cx', function (d) { return x(format.parse(d.key[0])); });
								endCircles.attr('cx', function (d) { return x(format.parse(d.key[1])); });

								// Translate the paths to their proper height.
								paths
									.transition()
										.attr("transform", function (d, i) { return "translate(0," + yStep(i) + ")"; });

								// Show the circles.
								circles.style("display", "inline");
							} else {
								// Hide the circles.
								circles.style("display", "none");

								lines.attr('stroke', fill);
								lines
									.transition()
										.attr('x1', function (d) { return x(format.parse(d.key[0])); })
										.attr('y1', y(0))
										.attr('x2', function (d) { return x(format.parse(d.key[1])); })
										.attr('y2', y(1));

								// All parallel bars start at 0.
								paths
									.transition()
										.attr("transform", "translate(0,0)");
							}
						}
					}

					function reset() {
						if (group) group.remove();
						if (dim) {
							dim.filterAll();
							dim.remove();
							removeFilterText();
						}
						if (svg) svg.remove();
						palladioService.update();
					}

					scope.filterReset = function () {
						reset();
						setup();
						update();
					};

					scope.$watchGroup(['dateStartDim', 'dateEndDim', 'tooltipLabelDim', 'groupDim'], function () {
						reset();
						setup();
						update();
					});

					scope.$watch('stepMode', function (nv, ov) {
						if(nv !== undefined) {
							update();
						}
					});
          
          // Save SVG
          scope.saveAsSVG = function() {
            var svgsaver = new SvgSaver();
            var svg = element.find("svg")[0];
            console.log(svg);
            svgsaver.asSvg(svg, "Palladio_timespan_" + scope.title + ".svg");      
          };

					//
					// If you are going to programatically instantiate your visualization, do it
					// here. Your visualization should emit the following events if necessary:
					//
					// For new/changed filters:
					//
					// scope.$emit('updateFilter', [identifier, description, filter, callback]);
					//
					// For removing all filters:
					//
					// scope.$emit('updateFilter', [identifier, null]);
					//
					// If you apply a filter in this component, notify the Palladio framework.
					//
					// identifier: A string unique to this instance of this component. Should
					//             be randomly generated.
					//
					// description: A human-readable description of this component. Should be
					//              unique to this instance of this component, but not required.
					//
					// filter: A human-readable description of the filter that is currently
					//         applied on this component.
					//
					// callback: A function that will remove all filters on this component when
					//           it is evaluated.
					//
					//
					// Whenever the component needs to trigger an update for all other components
					// in the application (for example, when a filter is applied or removed):
					//
					// scope.$emit('triggerUpdate');

					var deregister = [];

					// You should also handle the following externally triggered events:

					deregister.push(palladioService.onReset(scope.uniqueToggleId, function() {

						// Reset any filters that have been applied through this visualization.
						// This means running .filterAll() on any Crossfilter dimensions you have
						// created and updating your visualization as required.

						scope.filterReset();

					}));

					deregister.push(palladioService.onUpdate(scope.uniqueToggleId, function() {
						// Only update if the table is visible.
						update();
					}));

					scope.$on('$destroy', function () {

						// Clean up after yourself. Remove dimensions that we have created. If we
						// created watches on another scope, destroy those as well.

						if(dim) {
							dim.filterAll();
							group.remove();
							dim.remove();
							dim = undefined;
						}
						deregister.forEach(function(f) { f(); });
						deregister = [];

					});


					// Support save/load. These functions should be able to fully recreate an instance
					// of this visualization based on the results of the exportState() function. Include
					// current filters, any type of manipulations the user has done, etc.

					function importState(state) {

						// Load a state object created by exportState().
						scope.title = state.title;
						scope.dateStartDim = scope.dateDims.filter(function(d) { return d.key === state.dateStartDim; })[0];
						scope.dateEndDim = scope.dateDims.filter(function(d) { return d.key === state.dateEndDim; })[0];
						scope.tooltipLabelDim = scope.labelDims.filter(function(d) { return d.key === state.tooltipLabelDim; })[0];

						// Apply settings
						scope.$digest();
						
						topBrush.extent(state.topExtent.map(function(d) { return dateService.format.parse(d); }));
						midBrush.extent(state.midExtent.map(function(d) { return dateService.format.parse(d); }));
						bottomBrush.extent(state.bottomExtent.map(function(d) { return dateService.format.parse(d); }));

						if(top && middle && bottom) {
							topBrush.event(top);
							midBrush.event(middle);
							bottomBrush.event(bottom);

							top.call(topBrush);
							middle.call(midBrush);
							bottom.call(bottomBrush);
						}

						scope.stepMode = state.mode;

					}

					function exportState() {

						// Return a state object that can be consumed by importState().
						return {
							title: scope.title,
							dateStartDim: scope.dateStartDim ? scope.dateStartDim.key : undefined,
							dateEndDim: scope.dateEndDim ? scope.dateEndDim.key : undefined,
							tooltipLabelDim: scope.tooltipLabelDim ? scope.tooltipLabelDim.key : undefined,
							topExtent: topBrush && topBrush.extent() ? topBrush.extent().map(function(d) { return dateService.format(d); }) : [],
							midExtent: midBrush && midBrush.extent() ? midBrush.extent().map(function(d) { return dateService.format(d); }) : [],
							bottomExtent: bottomBrush && bottomBrush.extent() ? bottomBrush.extent().map(function(d) { return dateService.format(d); }) : [],
							mode: scope.stepMode
						};
					}

					deregister.push(palladioService.registerStateFunctions(scope.uniqueToggleId, 'partime', exportState, importState));

					// Move the modal out of the fixed area.
					$(element[0]).find('#date-start-modal').parent().appendTo('body');

					// Set up the toggle if in view state.
					if(scope.view) {
						$(document).ready(function(){
							$(element[0]).find('.toggle').click(function() {
								$(element[0]).find('.settings').toggleClass('open close');
							});
						});
					}
				}
			}
		};

		return directiveObj;
	}]);
