# SCSS Compilation for overriddes.css

The setup involves a webpack configuration that compiles SCSS files, minimizes the resulting CSS, removes any comments, and copies the final CSS to designated output directories.

## Configuration Breakdown

- **Entry**: Defines the entry point for the webpack build. In this case, it is set to compile `one/scss/overrides.scss`.

- **Output**: The output directory is set to `one/css`, and the filename is arbitrarily set to `[name].css.js`. The `.js` files will be removed post-build.

## Usage

To run the webpack build process, use the following command:

```bash
npm run build-css