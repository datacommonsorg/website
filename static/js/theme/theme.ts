export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  typography: {
    fontFamily: string;
    fontSize: string;
    fontWeight: {
      regular: number;
      bold: number;
    };
  };
  spacing: {
    small: string;
    medium: string;
    large: string;
  };
}

const theme: Theme = {
  colors: {
    primary: "#0b57d0",
    secondary: "#004a77",
    background: "#f5f5f5",
    text: "#212529",
  },
  typography: {
    fontFamily: "'Google Sans Text', Arial, sans-serif",
    fontSize: "16px",
    fontWeight: {
      regular: 400,
      bold: 700,
    },
  },
  spacing: {
    small: "8px",
    medium: "16px",
    large: "24px",
  },
};

export default theme;
