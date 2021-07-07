import { ContainerInstance } from './container-instance.class';
import { Token } from './token.class';
import { Handler } from './interfaces/handler.interface';
import { Constructable } from './types/constructable.type';
import { ServiceIdentifier } from './types/service-identifier.type';
import { ServiceOptions } from './interfaces/service-options.interface';
import { AbstractConstructable } from './types/abstract-constructable.type';

/**
 * Service container.
 */
export class Container {
  /**
   * All registered handlers. The @Inject() decorator uses handlers internally to mark a property for injection.
   **/
  static readonly handlers: Map<Function, { params: Handler[]; properties: Handler[] }> = new Map();

  /**  Global container instance. */
  private static readonly globalInstance: ContainerInstance = new ContainerInstance('default');

  /** Other containers created using Container.of method. */
  private static readonly instances: ContainerInstance[] = [];

  /**
   * Gets a separate container instance for the given instance id.
   */
  static of(containerId: string = 'default'): ContainerInstance {
    if (containerId === 'default') return this.globalInstance;

    let container = this.instances.find(instance => instance.id === containerId);
    if (!container) {
      container = new ContainerInstance(containerId);
      this.instances.push(container);
      // TODO: Why we are not reseting here? Let's reset here. (I have added the commented code.)
      // container.reset();
    }

    return container;
  }

  /**
   * Checks if the service with given name or type is registered service container.
   * Optionally, parameters can be passed in case if instance is initialized in the container for the first time.
   */
  static has<T>(type: Constructable<T>): boolean;
  static has<T>(id: string): boolean;
  static has<T>(id: Token<T>): boolean;
  static has<T>(identifier: ServiceIdentifier): boolean {
    return this.globalInstance.has(identifier as any);
  }

  /**
   * Retrieves the service with given name or type from the service container.
   * Optionally, parameters can be passed in case if instance is initialized in the container for the first time.
   */
  static get<T>(type: Constructable<T>): T;
  static get<T>(type: AbstractConstructable<T>): T;
  static get<T>(id: string): T;
  static get<T>(id: Token<T>): T;
  static get<T>(identifier: ServiceIdentifier<T>): T {
    return this.globalInstance.get(identifier as any);
  }

  /**
   * Gets all instances registered in the container of the given service identifier.
   * Used when service defined with multiple: true flag.
   */
  static getMany<T>(id: string): T[];
  static getMany<T>(id: Token<T>): T[];
  static getMany<T>(id: string | Token<T>): T[] {
    return this.globalInstance.getMany(id as any);
  }

  /**
   * Sets a value for the given type or service name in the container.
   */
  static set<T = unknown>(type: Function, value: any): Container;
  static set<T = unknown>(type: Constructable<T>, value: any): Container;
  static set<T = unknown>(type: AbstractConstructable<T>, value: any): Container;
  static set<T = unknown>(name: string, value: any): Container;
  static set<T = unknown>(token: Token<T>, value: any): Container;
  static set<T = unknown>(value: ServiceOptions<T>): Container;
  static set<T = unknown>(values: ServiceOptions<T>[]): Container;
  static set(
    identifierOrServiceMetadata: ServiceIdentifier | ServiceOptions<any> | ServiceOptions<any>[],
    value?: any
  ): Container {
    this.globalInstance.set(identifierOrServiceMetadata as any, value);
    return this;
  }

  /**
   * Removes services with a given service identifiers.
   */
  static remove(identifierOrIdentifierArray: ServiceIdentifier | ServiceIdentifier[]): Container {
    this.globalInstance.remove(identifierOrIdentifierArray);

    return this;
  }

  /**
   * Completely resets the container by removing all previously registered services and handlers from it.
   */
  static reset(containerId: string = 'default'): Container {
    if (containerId == 'default') {
      this.globalInstance.reset();
      this.instances.forEach(instance => instance.reset());
    } else {
      const instance = this.instances.find(instance => instance.id === containerId);
      if (instance) {
        instance.reset();
        this.instances.splice(this.instances.indexOf(instance), 1);
      }
    }
    return this;
  }

  /**
   * Registers a new handler.
   */
  static registerHandler(handler: Handler): Container {
    const index = handler.index;
    let handlerObj: { params: Handler[]; properties: Handler[] };
    if (index !== undefined) {
      if (this.handlers.has(handler.object)) {
        handlerObj = this.handlers.get(handler.object)!;
        handlerObj.params.push(handler);
      } else {
        handlerObj = { params: [], properties: [] };
        handlerObj.params.push(handler);
      }
      this.handlers.set(handler.object, handlerObj!);
      return this;
    }

    if (this.handlers.has(handler.object.constructor)) {
      handlerObj = this.handlers.get(handler.object.constructor)!;
      handlerObj.properties.push(handler);
    } else {
      handlerObj = { params: [], properties: [] };
      handlerObj.properties.push(handler);
    }
    this.handlers.set(handler.object.constructor, handlerObj!);
    return this;
  }

  /**
   * Helper method that imports given services.
   */
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  static import(services: Function[]): Container {
    /* istanbul ignore next */
    return this;
  }
}
