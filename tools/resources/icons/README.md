# Data Commons Material UI Icon Generation Tool

## Produce via script

A python script is provided to quickly and easily generate a React component
that displays a Material UI Icon, an SVG of a Material UI icon for use in the 
Jinja templates or both.

### Script Usage

To generate both a React component and an SVG of a Material UI icon, run the
following command from inside the `tools/resources/icons` directory:

```bash
./run.sh {icon_name}
````

For example:

```bash
./run.sh arrow_forward
````

This will download the SVG from the Material UI repository, process it and 
generate two files:
- An SVG for use in Jinja templates in the `server/templates/resources/icons`
  directory. 
- A React component in `static/js/components/elements/icons`.

To generate only the SVG for the templates, run either of the following commands:

```bash
./run.sh -f arrow_forward
./run.sh --flask arrow_forward
```

To generate only the React component run either of the following commands:

```bash
./run.sh -r arrow_forward
./run.sh --react arrow_forward
```

It is recommended to run the prettier on the generated `.tsx` file.

## Produce manually

If for any reason you need to generate an icon manually (for example, if an icon
is not available from the repository via the script), you can do so with these
directions. Note that this should only rarely be required.
1. Download the SVG. If it is a Material UI font, it will likely come from
   https://fonts.google.com/icons
2. Change the height to "1em". Change the fill to "currentColor". Remove the width.
3. For use in the Jinja templates, copy this SVG into `server/templates/resources/icons`.
4. For use as a React component
   1. open an existing component in `static/js/components/elements/icons`, and save it
      with the new icon's name.
   2. Update the source to indicate the source of the SVG you are using. This might
      be https://fonts.google.com/icons.
   3. Update the name in the comments.
   4. Paste the SVG over top of the old SVG.
   5. Add {...props} as the final prop in the SVG before the `>`.

## Usage

### Jinja Templates

To use a generated icon in a Jinja template

```
{% from 'macros/icons.html' import inline_svg %}

{{ inline_svg('arrow_forward') }}
```

### React

You can use the React component directly inside the JSX:

```jsx
<ArrowForward />
```

If done so without explicitly providing color and size, the icon
will inherit its color and size from the enclosing CSS, just as a 
font icon would. For example:

```css
span.big-red-icon {
   font-size: 50px;
   color: red;
}
```
```jsx
<span className="big-red-icon">
  <ArrowForward />
</span>
```
This allows you to use the React component icons much as you would the Material
Icons provided through Google Fonts, with the added advantage that they are inline
and not subject to flashes of unstyled content.

You can also style the icons directly with its props. Each added icon 
component can take any prop that you can send into an SVG.

```jsx
<ArrowForward
  fill="red"
  height="50px"
/>
```