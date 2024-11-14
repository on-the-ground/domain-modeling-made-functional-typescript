// https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/#decorators
export function bound(originalMethod: any, context: ClassMemberDecoratorContext) {
    const methodName = context.name;
    if (context.private) {
        throw new Error(`'bound' cannot decorate private properties like ${methodName as string}.`);
    }
    context.addInitializer(function () {
        // @ts-ignore: TS2571
        this[methodName] = this[methodName].bind(this);
    });
}