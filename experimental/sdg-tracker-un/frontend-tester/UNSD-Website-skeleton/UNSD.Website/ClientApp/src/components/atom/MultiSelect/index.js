import React from "react";
import Select from "react-dropdown-select";

export class MultiSelectDropdown extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      items: this.props.value,
      saveValueOptions: this.props.saveValueOptions,
      options: this.props.options,
      color: "#4D4D4D",
      dropdownHeight: "300px",
      searchable: true,
    };
  }

  onClicks = (item) => {
    this.props.setFilteredData(item);
  };

  customItemRenderer = ({ item, itemIndex, props, state, methods }) => (
    <React.Fragment>
      {state.values.map((a) => a.value).includes(item.value) ? (
        <div
          style={{ color: "#4D4D4D" }}
          onClick={() => {
            methods.addItem({ value: item.value, label: item.label });
          }}
        ></div>
      ) : (
        <div
          className={
            state.cursor == itemIndex
              ? "react-dropdown-options-active"
              : "react-dropdown-options"
          }
          onClick={() => {
            methods.addItem({ value: item.value, label: item.label });
          }}
        >
          {item.label}
        </div>
      )}
    </React.Fragment>
  );

  render() {
    return (
      <Select
        noDataRenderer={this.props.noDataRenderer}
        options={this.props.options}
        values={this.props.defvalue}
        multi={this.props.multi}
        keepSelectedInList={false}
        closeOnSelect={this.props.closeOnSelect}
        onChange={this.props.onChange}
        value={this.props.value}
        name={this.props.name}
        className={this.props.className}
        color={this.state.color}
        searchable={this.props.searchable}
        searchFn={this.props.searchFn}
        placeholder={this.props.placeholder}
        disabled={this.props.disable}
      />
    );
  }
}
export default MultiSelectDropdown;
