import 'reflect-metadata';
import { Constructable, Container } from '../src/index';
import { Service } from '../src/decorators/service.decorator';
import { Token } from '../src/token.class';
import { ServiceNotFoundError } from '../src/error/service-not-found.error';

describe('Container', function () {
  beforeEach(() => Container.reset({ strategy: 'resetValue' }));

  describe('get', () => {
    it('should be able to get a boolean', () => {
      const booleanTrue = 'boolean.true';
      const booleanFalse = 'boolean.false';
      Container.set({ id: booleanTrue, value: true });
      Container.set({ id: booleanFalse, value: false });

      expect(Container.get(booleanTrue)).toBe(true);
      expect(Container.get(booleanFalse)).toBe(false);
    });

    it('should be able to get an empty string', () => {
      const emptyString = 'emptyString';
      Container.set({ id: emptyString, value: '' });

      expect(Container.get(emptyString)).toBe('');
    });

    it('should be able to get the 0 number', () => {
      const zero = 'zero';
      Container.set({ id: zero, value: 0 });

      expect(Container.get(zero)).toBe(0);
    });
  });

  describe('set', function () {
    it('should be able to set a class into the container', function () {
      class TestService {
        constructor(public name: string) {}
      }
      const testService = new TestService('this is test');
      Container.set({ id: TestService, value: testService });
      expect(Container.get(TestService)).toBe(testService);
      expect(Container.get(TestService).name).toBe('this is test');
    });

    it('should be able to set a named service', function () {
      class TestService {
        constructor(public name: string) {}
      }
      const firstService = new TestService('first');
      Container.set({ id: 'first.service', value: firstService });

      const secondService = new TestService('second');
      Container.set({ id: 'second.service', value: secondService });

      expect(Container.get<TestService>('first.service').name).toBe('first');
      expect(Container.get<TestService>('second.service').name).toBe('second');
    });

    it('should be able to set a tokenized service', function () {
      class TestService {
        constructor(public name: string) {}
      }
      const FirstTestToken = new Token<TestService>();
      const SecondTestToken = new Token<TestService>();

      const firstService = new TestService('first');
      Container.set({ id: FirstTestToken, value: firstService });

      const secondService = new TestService('second');
      Container.set({ id: SecondTestToken, value: secondService });

      expect(Container.get(FirstTestToken).name).toBe('first');
      expect(Container.get(SecondTestToken).name).toBe('second');
    });

    it('should override previous value if service is written second time', function () {
      class TestService {
        constructor(public name: string) {}
      }
      const TestToken = new Token<TestService>();

      const firstService = new TestService('first');
      Container.set({ id: TestToken, value: firstService });
      expect(Container.get(TestToken)).toBe(firstService);
      expect(Container.get(TestToken).name).toBe('first');

      const secondService = new TestService('second');
      Container.set({ id: TestToken, value: secondService });

      expect(Container.get(TestToken)).toBe(secondService);
      expect(Container.get(TestToken).name).toBe('second');
    });
  });

  describe('set multiple', function () {
    it('should be able to provide a list of values', function () {
      class TestService {}

      class TestServiceFactory {
        create() {
          return 'test3-service-created-by-factory';
        }
      }

      const testService = new TestService();
      const test1Service = new TestService();
      const test2Service = new TestService();

      Container.set({ id: TestService, value: testService });
      Container.set({ id: 'test1-service', value: test1Service });
      Container.set({ id: 'test2-service', value: test2Service });
      Container.set({ id: 'test3-service', factory: [TestServiceFactory, 'create'] });

      expect(Container.get(TestService)).toBe(testService);
      expect(Container.get<TestService>('test1-service')).toBe(test1Service);
      expect(Container.get<TestService>('test2-service')).toBe(test2Service);
      expect(Container.get<string>('test3-service')).toBe('test3-service-created-by-factory');
    });
  });

  describe('remove', function () {
    it('should be able to remove previously registered services', function () {
      class TestService {
        constructor() {}
      }

      const testService = new TestService();
      const test1Service = new TestService();
      const test2Service = new TestService();

      Container.set({ id: TestService, value: testService });
      Container.set({ id: 'test1-service', value: test1Service });
      Container.set({ id: 'test2-service', value: test2Service });

      expect(Container.get(TestService)).toBe(testService);
      expect(Container.get<TestService>('test1-service')).toBe(test1Service);
      expect(Container.get<TestService>('test2-service')).toBe(test2Service);

      Container.remove(['test1-service', 'test2-service']);

      expect(Container.get(TestService)).toBe(testService);
      expect(() => Container.get<TestService>('test1-service')).toThrowError(ServiceNotFoundError);
      expect(() => Container.get<TestService>('test2-service')).toThrowError(ServiceNotFoundError);
    });
  });

  describe('reset', function () {
    it('should support container reset', () => {
      @Service()
      class TestService {
        constructor(public name: string = 'frank') {}
      }

      Container.set({ id: TestService, type: TestService });
      const testService = Container.get(TestService);
      testService.name = 'john';

      expect(Container.get(TestService)).toBe(testService);
      expect(Container.get(TestService).name).toBe('john');
      Container.reset({ strategy: 'resetValue' });
      expect(Container.get(TestService)).not.toBe(testService);
      expect(Container.get(TestService).name).toBe('frank');
    });
  });

  describe('registerHandler', function () {
    it('should have ability to pre-specify class initialization parameters', function () {
      @Service()
      class ExtraService {
        constructor(public luckyNumber: number, public message: string) {}
      }

      Container.registerHandler({
        object: ExtraService,
        index: 0,
        value: containerInstance => 777,
      });

      Container.registerHandler({
        object: ExtraService,
        index: 1,
        value: containerInstance => 'hello parameter',
      });

      expect(Container.get(ExtraService).luckyNumber).toBe(777);
      expect(Container.get(ExtraService).message).toBe('hello parameter');
    });

    it('should have ability to pre-specify initialized class properties', function () {
      function CustomInject(value: any) {
        return function (target: any, propertyName: string) {
          Container.registerHandler({
            object: target,
            propertyName: propertyName,
            value: containerInstance => value,
          });
        };
      }

      @Service()
      class ExtraService {
        @CustomInject(888)
        badNumber: number;

        @CustomInject('bye world')
        byeMessage: string;
      }

      expect(Container.get(ExtraService).badNumber).toBe(888);
      expect(Container.get(ExtraService).byeMessage).toBe('bye world');
    });

    it('should inject the right value in subclass constructor params', function () {
      function CustomInject(value: any) {
        return function (target: Constructable<any>, propertyName: string, index: number) {
          Container.registerHandler({
            object: target,
            propertyName: propertyName,
            index: index,
            value: containerInstance => value,
          });
        };
      }

      @Service()
      class SuperService {
        constructor(@CustomInject(888) readonly num: number) {}
      }

      @Service()
      class SubService extends SuperService {
        constructor(@CustomInject(666) num: number) {
          super(num);
        }
      }

      expect(Container.get(SuperService).num).toBe(888);
      expect(Container.get(SubService).num).toBe(666);
    });
  });

  describe('set with ServiceMetadata passed', function () {
    it('should support factory functions', function () {
      class Engine {
        public serialNumber = 'A-123';
      }

      class Car {
        constructor(public engine: Engine) {}
      }

      Container.set({
        id: Car,
        factory: () => new Car(new Engine()),
      });

      expect(Container.get(Car).engine.serialNumber).toBe('A-123');
    });

    it('should support factory classes', function () {
      @Service()
      class Engine {
        public serialNumber = 'A-123';
      }

      class Car {
        constructor(public engine: Engine) {}
      }

      @Service()
      class CarFactory {
        constructor(private engine: Engine) {}

        createCar(): Car {
          return new Car(this.engine);
        }
      }

      Container.set({
        id: Car,
        factory: [CarFactory, 'createCar'],
      });

      expect(Container.get(Car).engine.serialNumber).toBe('A-123');
    });

    it('should support tokenized services from factories', function () {
      interface Vehicle {
        getColor(): string;
      }

      class Bus implements Vehicle {
        getColor(): string {
          return 'yellow';
        }
      }

      class VehicleFactory {
        createBus(): Vehicle {
          return new Bus();
        }
      }

      const VehicleService = new Token<Vehicle>();

      Container.set({
        id: VehicleService,
        factory: [VehicleFactory, 'createBus'],
      });

      expect(Container.get(VehicleService).getColor()).toBe('yellow');
    });
  });

  describe('Container.reset', () => {
    it('should call dispose function on removed service', () => {
      const destroyFnMock = jest.fn();
      const destroyPropertyFnMock = jest.fn();
      @Service()
      class MyServiceA {
        dispose() {
          destroyFnMock();
        }
      }

      @Service()
      class MyServiceB {
        public dispose = destroyPropertyFnMock;
      }

      const instanceAOne = Container.get(MyServiceA);
      const instanceBOne = Container.get(MyServiceB);

      Container.reset({ strategy: 'resetValue' });

      const instanceATwo = Container.get(MyServiceA);
      const instanceBTwo = Container.get(MyServiceB);

      expect(destroyFnMock).toBeCalledTimes(1);
      expect(destroyPropertyFnMock).toBeCalledTimes(1);

      expect(instanceAOne).toBeInstanceOf(MyServiceA);
      expect(instanceATwo).toBeInstanceOf(MyServiceA);
      expect(instanceBOne).toBeInstanceOf(MyServiceB);
      expect(instanceBTwo).toBeInstanceOf(MyServiceB);

      expect(instanceAOne).not.toBe(instanceATwo);
      expect(instanceBOne).not.toBe(instanceBTwo);
    });

    it('should be able to destroy services without destroy function', () => {
      @Service()
      class MyService {}

      const instanceA = Container.get(MyService);

      Container.reset({ strategy: 'resetValue' });

      const instanceB = Container.get(MyService);

      expect(instanceA).toBeInstanceOf(MyService);
      expect(instanceB).toBeInstanceOf(MyService);
      expect(instanceA).not.toBe(instanceB);
    });
  });

  describe('Container.remove', () => {
    it('should call dispose function on removed service', () => {
      const destroyFnMock = jest.fn();
      const destroyPropertyFnMock = jest.fn();
      @Service()
      class MyServiceA {
        dispose() {
          destroyFnMock();
        }
      }

      @Service()
      class MyServiceB {
        public dispose = destroyPropertyFnMock();
      }

      Container.get(MyServiceA);
      Container.get(MyServiceB);

      expect(() => Container.remove(MyServiceA)).not.toThrowError();
      expect(() => Container.remove(MyServiceB)).not.toThrowError();

      expect(destroyFnMock).toBeCalledTimes(1);
      expect(destroyPropertyFnMock).toBeCalledTimes(1);

      expect(() => Container.get(MyServiceA)).toThrowError(ServiceNotFoundError);
      expect(() => Container.get(MyServiceB)).toThrowError(ServiceNotFoundError);
    });

    it('should be able to destroy services without destroy function', () => {
      @Service()
      class MyService {}

      Container.get(MyService);

      expect(() => Container.remove(MyService)).not.toThrowError();
      expect(() => Container.get(MyService)).toThrowError(ServiceNotFoundError);
    });
  });
});
