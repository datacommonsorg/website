export interface HeaderMenu {
  label: string;
  ariaLabel: string;
  subMenu: HeaderSubMenu[];
}

export interface HeaderSubMenu {
  href: string;
  label: string;
  hide?: boolean;
}

export interface FooterMenu {
  label: string;
  subMenu: FooterSubMenu[];
}

interface FooterSubMenu {
  href: string;
  label: string;
  hide?: boolean;
}
