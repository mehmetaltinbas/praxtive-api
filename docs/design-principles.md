# SOLID Principles

## 1. Single Responsibility Principle (SRP)

Each class, function, or module should have one reason to change.

## 2. Open-Closed Principle (OCP)

Software entities should be open for extension but closed for modification.
Use strategy pattern if a new behavior is needed rather than adding if/else or switch/case blocks.

## 3. Liskov Substitution Principle (LSP)

Objects of a superclass should be replaceable with objects of its subclasses without breaking the application.

## 4. Interface Segregation Principle (ISP)

Clients should not be forced to depend on methods they do not use.
Create small, specific interfaces rather than one massive "God Interface." This prevents classes from having to implement methods that are irrelevant to their specific context.

## 5. Dependency Inversion Principle (DIP)

Depend on abstractions (interfaces), not on concrete implementations.

# Architectural & Design Principles

## 6. Composition over Inheritance

Favor achieving polymorphic behavior and code reuse by combining objects (composition) rather than strictly extending classes (inheritance).
Instead of creating deep inheritance trees for services, inject multiple smaller services into a controller or a facade service to provide the required functionality.

## 7. Don't Repeat Yourself (DRY)

Every piece of knowledge must have a single, unambiguous representation within a system.
Move shared logic into Pipes, Interceptors, or Guard classes. Use shared utility modules for common functions used across multiple features.

## 8. Separation of Concerns (SoC)

The application should be split into distinct sections, each addressing a separate concern.
Adhere to the Module-based architecture. Each feature should be encapsulated in its own Module.

## 9. Law of Demeter (LoD)

A module should not know about the inner workings of the objects it manipulates (the "principle of least knowledge").

## 10. Keep it Simple, Stupid (KISS)

Most systems work best if they are kept simple rather than made complicated.
Avoid over-engineering patterns or creating complex abstractions before they are truly necessary. Prioritize readability and standard NestJS patterns over "clever" but obscure TypeScript tricks.
