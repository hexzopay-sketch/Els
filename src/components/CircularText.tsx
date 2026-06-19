"use client";
import styles from "./CircularText.module.css";

export default function CircularText({ text }: { text: string }) {
  const chars = text.split("");
  return (
    <div className={styles.container}>
      <div className={styles.circle}>
        {chars.map((char, i) => (
          <span
            key={i}
            className={styles.char}
            style={{
              transform: `rotate(${(360 / chars.length) * i}deg) translateY(-20rem)`
            }}
          >
            {char}
          </span>
        ))}
      </div>
      <div className={styles.circleReverse}>
        {chars.map((char, i) => (
          <span
            key={i}
            className={styles.charReverse}
            style={{
              transform: `rotate(${(360 / chars.length) * i}deg) translateY(-26rem)`
            }}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  );
}