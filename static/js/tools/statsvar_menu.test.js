import React from "react";
import { Menu } from "./statsvar_menu";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";
import pretty from "pretty";

let container = null;
beforeEach(() => {
  // setup a DOM element as a render target
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  // cleanup on exiting
  unmountComponentAtNode(container);
  container.remove();
  container = null;
});

it("filtering the menu", () => {
    // input: one valid statsVar selected
    // expecting: menu filtered, node Demographics expanded, node Count_Person checked
    act(() => {
      render(<Menu statsVarPaths={[[0,0]]}
                   statsVarValid={new Set(["Count_Person"])}
                   filter={true}
                   setStatsVarTitle= {({}) => {}}/>, container);
    });
    expect(pretty(container.innerHTML)).toMatchSnapshot();

    // input: non-valid statsVar, expecting: empty menu
    act(() => {
        render(<Menu statsVarPaths={[[0,0]]}
                     statsVarValid={new Set([])}
                     filter={true}
                     setStatsVarTitle= {({}) => {}}/>, container);
      });
    expect(pretty(container.innerHTML)).toMatchSnapshot();

    // input: selected statsVar Count_Person is not valid
    // expecting: Medium Age expanded, Count_Person not shown
    act(() => {
        render(<Menu statsVarPaths={[[0,0]]}
                     statsVarValid={new Set(["Median_Age_Person"])}
                     filter={true}
                     setStatsVarTitle= {({}) => {}}/>, container);
      });
      expect(pretty(container.innerHTML)).toMatchSnapshot();
  });

// Todo(Lijuan): add test for setting statsVar titles

