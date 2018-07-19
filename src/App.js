import React, { Component } from 'react';
import './App.css';
import * as d3 from 'd3';
import _ from 'lodash';
import Expenses from './visualizations/Expenses';
import Day from './visualizations/Day';
import Categories from './visualizations/Categories';

import expensesData from './data/expenses.json';

const width = 750;
const height = 1800;
const colors = {
  white: '#fff8fa',
  gray: '#e1ecea',
  black: '#516561',
};

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      expenses: [],
      categories: [
        {name: 'Restaurants', expenses: [], total: 0},
        {name: 'Travel', expenses: [], total: 0},
        {name: 'Dessert', expenses: [], total: 0},
      ],
      categoryBeingAdded: null,
      selectedWeek: null,
    };

    this.deleteCategory = this.deleteCategory.bind(this);
  }

  componentWillMount() {
    // process data
    const expenses = _.chain(expensesData)
      .filter(d => d.Amount < 0)
      .map((d, i) => {
        return {
          id: i,
          amount: -d.Amount,
          name: d.Description,
          date: new Date(d['Trans Date']),
          categories: 0,
        }
      }).value();

    // default selected week will be the most recent week
    const selectedWeek = d3.max(expenses, exp => d3.timeWeek.floor(exp.date));

    this.setState({expenses, selectedWeek});
  }

  prevWeek = () => {
    // todo: error handling
    const selectedWeek = d3.timeWeek.offset(this.state.selectedWeek, -1);
    this.setState({selectedWeek});
  };

  nextWeek = () => {
    // todo: error handling
    const selectedWeek = d3.timeWeek.offset(this.state.selectedWeek, 1);
    this.setState({selectedWeek});
  };

  linkToCategory = (expense, category) => {
    if (_.includes(category.expenses, expense)) {
      category.expenses = _.without(category.expenses, expense);
      expense.categories -= 1;
    } else {
      category.expenses.push(expense);
      expense.categories += 1;
    }
    this.forceUpdate();
  };

  editDate = (expense, day) => {
    expense.date = day.date;
    this.forceUpdate();
  };

  startCategory = (event) => {
    const category = {
      name: event.target.value,
      expenses: [],
      total: 0,
    };
    this.setState({categoryBeingAdded: category});
  };

  clearCategory = (event) => {
    event.target.value = '';
    event.target.blur();
    this.setState({categoryBeingAdded: null});
  };

  addCategory = (event) => {
    const ENTER_CODE = 13;
    const ESC_CODE = 27;
    if (event.keyCode === ESC_CODE) {
      this.clearCategory(event);
    } else if (event.keyCode === ENTER_CODE) {
      // take the value of the input and create new category
      const category = Object.assign(this.state.categoryBeingAdded, {
        name: event.target.value,
        fx: null,
        fy: null,
      });
      const categories = this.state.categories;
      categories.push(category);

      // clear out the input form on successful submit
      event.target.value = '';
      event.target.blur();

      this.setState({categories, categoryBeingAdded: null});
    }
  };

  deleteCategory = (category) => {
    const categories = _.filter(this.state.categories, d => d.name !== category.name);
    this.setState({categories});
  };

  render() {
    const selectedWeek = d3.timeFormat('%B %d, %Y')(this.state.selectedWeek);
    const style = {
      width,
      margin: 'auto',
    };
    const svgStyle = {
      overflow: 'visible',
      position: 'absolute',
      top: 0,
      width,
      height,
      zIndex: -1,
    };
    const inputStyle = {
      fontSize: 14,
      textAlign: 'center',
      display: 'block',
      padding: 5,
      width: 200,
      margin: 'auto',
      background: 'none',
      color: colors.black,
      border: 'none',
      borderBottom: '2px solid ' + colors.black,
    };
    const props = {
      width,
      colors,
      linkToCategory: this.linkToCategory,
      editDate: this.editDate,
      deleteCategory: this.deleteCategory,
    };

    return (
      <div className='App' style={style}>
        <h1 style={{textAlign: 'center', color: colors.black}}>
          <span style={{cursor: 'pointer'}} onClick={this.prevWeek}>← </span>
          Week of {selectedWeek}
          <span style={{cursor: 'pointer'}}  onClick={this.nextWeek}> →</span>
        </h1>
        <input id='addCategory' style={inputStyle} type='text' placeholder='Add Category'
               onFocus={this.startCategory} onBlur={this.clearCategory} onKeyDown={this.addCategory}/>
        <svg style={svgStyle}>
          <Day {...props} {...this.state} />
          <Categories {...props} {...this.state} />
          <Expenses {...props} {...this.state} />
        </svg>
      </div>
    );
  }
}

export default App;
