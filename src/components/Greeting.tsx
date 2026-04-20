type GreetingProps = {
  name: string | null;
};

/**
 * Renders a personalised greeting line.
 * - null  → "Hey there"
 * - name  → "Hey {name}"
 */
export default function Greeting({ name }: GreetingProps) {
  return (
    <p className="font-sans text-ink text-base font-medium">
      {name ? `Hey ${name}` : "Hey there"}
    </p>
  );
}
