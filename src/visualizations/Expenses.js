import React, { Component } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';

const height = 650;
const dayWidth = 55;
const dayHeight = 75;
const margin = { left: 40, top: 20, right: 40, bottom: 20 };
const topPadding = 150;
const radius = 8;
let fontSize = 14;

// d3 functions
const xScale = d3.scaleLinear().domain([0, 6]);
const yScale = d3.scaleLinear().range([height - margin.bottom, margin.top]);
const amountScale = d3.scaleLinear().range([radius, 3 * radius]);
const simulation = d3.forceSimulation()
  .alphaDecay(0.001)
  .velocityDecay(0.3)
  .force('collide', d3.forceCollide(d => d.radius + 2))
  .force('x', d3.forceX(d => d.focusX))
  .force('y', d3.forceY(d => d.focusY))
  .stop();
const drag = d3.drag();

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {};
    this.forceTick = this.forceTick.bind(this);
    this.dragStart = this.dragStart.bind(this);
    this.dragExpense = this.dragExpense.bind(this);
    this.dragEnd = this.dragEnd.bind(this);
    this.mouseOver = this.mouseOver.bind(this);
  }

  componentWillMount() {
    xScale.range([margin.left, this.props.width - margin.right]);
    simulation.on('tick', this.forceTick);
    drag.on('start', this.dragStart)
      .on('drag', this.dragExpense)
      .on('end', this.dragEnd);
  }

  componentDidMount() {
    this.container = d3.select(this.refs.container).append('g');
    this.hover = d3.select(this.refs.container).append('g');
    this.hover.append('rect')
      .attr('height', fontSize + 4)
      .attr('y', -fontSize / 2 - 2)
      .attr('opacity', 0.85)
      .attr('fill', this.props.colors.white);
    this.hover.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', this.props.colors.black)
      .style('font-size', fontSize)
      .style('pointer-events', 'none');

    this.calculateData();
    this.renderCircles();

    simulation.nodes(this.props.expenses).alpha(0.9).restart();
  }

  componentDidUpdate() {
    this.calculateData();
    this.renderCircles();

    simulation.nodes(this.props.expenses).alpha(0.9).restart();
  }

  calculateData() {
    const weeksExtent = d3.extent(this.props.expenses,
      d => d3.timeWeek.floor(d.date));
    yScale.domain(weeksExtent);
    const amountExtent = d3.extent(this.props.expenses, d => d.amount);
    amountScale.domain(amountExtent);

    this.expenses = _.chain(this.props.expenses)
      .groupBy(d => d3.timeWeek.floor(d.date))
      .map(expenses => {
        return _.map(expenses, exp => {
          const {x, y} = this.calculateDayPosition(exp.date, true);

          return Object.assign(exp, {
            radius: amountScale(exp.amount),
            focusX: x,
            focusY: y,
            x: exp.x || x,
            y: exp.y || y,
          });
        });
      }).flatten().value();

    // get min+max dates
    const [minDate, maxDate] = d3.extent(this.props.expenses,
      d => d3.timeDay.floor(d.date));
    // calculate all potential dates to drag expenses into
    const selectedWeek = d3.timeDay.range(this.props.selectedWeek,
      d3.timeWeek.offset(this.props.selectedWeek, 1));
    this.days = _.chain(selectedWeek)
      .map(date => Object.assign(this.calculateDayPosition(date, true), {date}))
      .union(_.map(d3.timeDay.range(minDate, maxDate),
        (date) => Object.assign(this.calculateDayPosition(date), {date})))
      .value();
  }

  calculateDayPosition(date, shouldSelectedWeekCurve) {
    const dayOfWeek = date.getDay();
    const week = d3.timeWeek.floor(date);
    const x = xScale(dayOfWeek);
    let y = yScale(week) + height + 2 * dayHeight;

    if (shouldSelectedWeekCurve &&
      week.getTime() === this.props.selectedWeek.getTime()) {
      const offset = Math.abs(3 - dayOfWeek);
      y = height - 2 * dayHeight - 0.5 * offset * dayHeight;
    }
    y += topPadding;

    return {x, y};
  }

  renderCircles() {
    // draw expenses circles
    this.circles = this.container.selectAll('.expense')
      .data(this.expenses, d => d.name);

    // exit
    this.circles.exit().remove();

    // enter+update
    this.circles = this.circles.enter().append('circle')
      .classed('expense', true)
      .attr('fill', this.props.colors.white)
      .style('cursor', 'move')
      .call(drag)
      .on('mouseover', this.mouseOver)
      .on('mouseleave', () => this.hover.style('display', 'none'))
      .merge(this.circles)
      .attr('r', d => d.radius)
      .attr('stroke', d => d.categories ? this.props.colors.black : '');
  }

  forceTick() {
    this.circles.attr('cx', d => d.x)
      .attr('cy', d => d.y);
  }

  dragStart() {
    this.dragging = true;
    this.hover.style('display', 'none');

    simulation.alphaTarget(0.3).restart();
    d3.event.subject.fx = d3.event.subject.x;
    d3.event.subject.fy = d3.event.subject.y;
  }

  dragExpense() {
    this.dragged = null;

    d3.event.subject.fx = d3.event.x;
    d3.event.subject.fy = d3.event.y;

    const expense = d3.event.subject;
    const expenseX = d3.event.x;
    const expenseY = d3.event.y;
    // go through all categories to see if overlapping
    _.each(this.props.categories, category => {
      const {x, y, radius} = category;
      if (x - radius < expenseX && expenseX < x + radius &&
        y - radius < expenseY && expenseY < y + radius) {
          this.dragged = {expense, category, type: 'category'};
        }
    });
    // go through all the days to see if expense overlaps
    _.each(this.days, day => {
      const {x, y} = day;
      if (x - dayWidth < expenseX && expenseX < x + dayWidth &&
        y - dayHeight < expenseY && expenseY < y + dayHeight) {
          this.dragged = {expense, day, type: 'day'};
        }
    });
  }

  dragEnd() {
    if (!d3.event.active) simulation.alphaTarget(0);
    d3.event.subject.fx = null;
    d3.event.subject.fy = null;

    if (this.dragged) {
      const {expense, category, day} = this.dragged;
      if (this.dragged.type === 'category') {
        this.props.linkToCategory(expense, category);
      } else if (this.dragged.type === 'day') {
        this.props.editDate(expense, day);
      }
    }
    this.dragged = null;
    this.dragging = false;
  }

  mouseOver(d) {
    if (this.dragging) return;
    this.hover.style('display', 'block');

    const {x, y, name} = d;
    this.hover.attr('transform', 'translate(' + [x, y + d.radius + fontSize] + ')');
    this.hover.select('text')
      .text(_.map(name.split(' '), _.capitalize).join(' '));
    let width = this.hover.select('text').node().getBoundingClientRect().width;
    this.hover.select('rect')
      .attr('width', width + 6)
      .attr('x', -width / 2 - 3);
  }

  render() {
    return (
      <g ref='container' />
    );
  }
}

export default App;
