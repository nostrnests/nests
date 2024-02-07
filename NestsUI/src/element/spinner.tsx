import "./spinner.css";

export interface IconProps {
  className?: string;
  size?: number;
}

const Spinner = ({ className, size, ...props }: IconProps) => (
  <svg
    width={size ?? 20}
    height={size ?? 20}
    stroke="currentColor"
    viewBox="0 0 20 20"
    {...props}
    className={className}
  >
    <g className="spinner_V8m1">
      <circle cx="10" cy="10" r="7.5" fill="none" strokeWidth="3"></circle>
    </g>
  </svg>
);

export default Spinner;
