# Domain Modeling Made Functional - TypeScript

This project is a TypeScript rewrite of the original **Domain Modeling Made Functional** F# project by Scott Wlaschin.

## Original Project
- Repository: [DomainModelingMadeFunctional (F#)](https://github.com/swlaschin/DomainModelingMadeFunctional)
- Author: **Scott Wlaschin**

## About This Project
This project aims to demonstrate **functional domain modeling** principles using TypeScript. It closely follows the structure and examples of the original F# project, adapting them to a TypeScript environment while preserving functional programming paradigms.

## License
This project follows the original project's license. See the [`LICENSE`](LICENSE) file for details.

## Contributing
Contributions and feedback are welcome! If you find any issues or have improvements, feel free to open an issue or a pull request.

## Translator’s Note
I first encountered Domain Modeling Made Functional by Scott Wlaschin in the spring of 2021. Until 2020, I had been developing large-scale platforms with Go, but when I joined a new company, I found myself working on the backend for an Electronic Medical Records (EMR) service. Go, which prioritizes simplicity, did not even have generics at the time, yet the new project I joined was being designed with TypeScript's sophisticated type system and functional programming via fp-ts for its GraphQL API. Moreover, I was unaware that EMR is notorious for its complex, stringent, and ever-changing domain. I quickly realized that DDD (Domain-Driven Design) is indispensable when working with EMR—if I didn't want the product to become a patchwork mess under rapidly shifting domain constraints.

At that time, I had no prior experience in backend service development, domain-driven design, or functional programming. This book was a beacon of light guiding me through that uncertainty.

The most valuable aspect of this book, in my opinion, is its accessibility and friendliness. While translating, I revisited the original text meticulously and found that almost every major concept encountered in real-world development is addressed through the process of designing and implementing simple examples. Instead of suddenly throwing abstract concepts at the reader, it gently introduces them with a readable and engaging style. Thanks to this, even I, who was encountering these concepts for the first time, could understand and absorb them. That’s why my first principle in translation was to make it as approachable as the original.

While this book faithfully introduces domain-driven design, its primary focus is on functional programming rather than DDD itself. It explains why functional programming is well-suited for DDD, how to implement it, and which key concepts are needed. Functional programming is a methodology that attempts to solve problems by centering everything around pure functions. However, practical software can never be composed entirely of pure functions. The parts of a program that are not pure functions are referred to as side effects in functional programming. The key objective of functional programming is to isolate these side effects from the pure logic rather than letting them spread indiscriminately across the codebase. This separation makes the codebase more predictable, reusable, readable, and testable.

The patterns used to isolate side effects are collectively referred to as effect patterns, or simply effects. In practical software, at least eight different effects are commonly used, meaning that multiple types of effects often coexist within a single piece of business logic. The approach of handling these various effects in a separate, dedicated space rather than letting them intermingle with business logic is known as an effect system.

Traditionally, the most widely used effect system has been monads. However, monads come with usability issues, particularly due to their composition rules (associativity constraints). As a result, an alternative approach has emerged—one that processes effects independently rather than through monads. This alternative, known as algebraic effects, has gained significant attention in modern programming.

When this book was first published in 2018, algebraic effect handlers were still an experimental feature in only a few languages. At that time, monads were the primary way to separate pure functions from effects. However, as of 2024, when this translation was written, the landscape has changed significantly. Almost all major programming languages now provide effect handlers either as built-in features or through libraries.

Additionally, since the original examples were written in F#, I felt it was necessary to rewrite them in languages more commonly used in the Korean software industry. TypeScript has a great algebraic effect system in the form of effect-ts, but to stay true to the original F# examples, I opted to use fp-ts with a traditional monad-based approach. Meanwhile, in Kotlin, I leveraged Arrow-KT's effect handler, which is highly ergonomic due to its DSL-based syntax, resulting in a more modern approach.

I chose TypeScript and Kotlin because:

- TypeScript is widely used in web-based applications.
- Kotlin is commonly used in native apps and various frameworks.
By selecting these two languages, I hoped to recreate the examples in a way that resonates with a broader developer audience.

I did worry that these adaptations might make the translated book slightly less approachable than the original. However, my stronger desire was to ensure that this book remains relevant to a new generation of developers who will consider algebraic effect handlers as a natural part of programming. I ask for your understanding in this regard.
