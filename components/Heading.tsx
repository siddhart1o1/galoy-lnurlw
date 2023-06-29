import React, { ReactNode } from "react";

interface HeadingProps {
  children: ReactNode;
  [x: string]: any;
}

export default function Heading({ children, ...props }: HeadingProps) {
  return (
    <h1 className="text-2xl  text-center w-9/10" {...props}>
      {children}
    </h1>
  );
}