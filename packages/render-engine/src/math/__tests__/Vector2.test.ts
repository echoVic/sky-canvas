/**
 * Vector2 单元测试
 * 基于 BDD (Behavior-Driven Development) 和 AAA (Arrange-Act-Assert) 模式
 */

import { describe, expect, it } from 'vitest';
import { Vector2 } from '../Vector2';

describe('Vector2', () => {
  describe('Given Vector2 construction', () => {
    describe('When creating with no parameters', () => {
      it('Then it should initialize to zero vector', () => {
        // Arrange & Act
        const vector = new Vector2();

        // Assert
        expect(vector.x).toBe(0);
        expect(vector.y).toBe(0);
      });
    });

    describe('When creating with specific coordinates', () => {
      it('Then it should set the correct x and y values', () => {
        // Arrange
        const x = 3;
        const y = 4;

        // Act
        const vector = new Vector2(x, y);

        // Assert
        expect(vector.x).toBe(x);
        expect(vector.y).toBe(y);
      });
    });

    describe('When accessing static constants', () => {
      it('Then ZERO should be (0, 0)', () => {
        // Arrange & Act
        const zero = Vector2.ZERO;

        // Assert
        expect(zero.x).toBe(0);
        expect(zero.y).toBe(0);
      });

      it('Then ONE should be (1, 1)', () => {
        // Arrange & Act
        const one = Vector2.ONE;

        // Assert
        expect(one.x).toBe(1);
        expect(one.y).toBe(1);
      });

      it('Then UP should be (0, -1)', () => {
        // Arrange & Act
        const up = Vector2.UP;

        // Assert
        expect(up.x).toBe(0);
        expect(up.y).toBe(-1);
      });

      it('Then DOWN should be (0, 1)', () => {
        // Arrange & Act
        const down = Vector2.DOWN;

        // Assert
        expect(down.x).toBe(0);
        expect(down.y).toBe(1);
      });

      it('Then LEFT should be (-1, 0)', () => {
        // Arrange & Act
        const left = Vector2.LEFT;

        // Assert
        expect(left.x).toBe(-1);
        expect(left.y).toBe(0);
      });

      it('Then RIGHT should be (1, 0)', () => {
        // Arrange & Act
        const right = Vector2.RIGHT;

        // Assert
        expect(right.x).toBe(1);
        expect(right.y).toBe(0);
      });
    });
  });

  describe('Given Vector2 basic operations', () => {
    describe('When cloning a vector', () => {
      it('Then it should create a new vector with same values', () => {
        // Arrange
        const original = new Vector2(5, 10);

        // Act
        const cloned = original.clone();

        // Assert
        expect(cloned).not.toBe(original); // Different instances
        expect(cloned.x).toBe(original.x);
        expect(cloned.y).toBe(original.y);
      });
    });

    describe('When setting vector values', () => {
      it('Then it should update x and y coordinates', () => {
        // Arrange
        const vector = new Vector2(1, 2);
        const newX = 7;
        const newY = 8;

        // Act
        const result = vector.set(newX, newY);

        // Assert
        expect(result).toBe(vector); // Should return self for chaining
        expect(vector.x).toBe(newX);
        expect(vector.y).toBe(newY);
      });
    });

    describe('When copying from another vector', () => {
      it('Then it should copy the values from the other vector', () => {
        // Arrange
        const source = new Vector2(15, 25);
        const target = new Vector2(1, 1);

        // Act
        const result = target.copy(source);

        // Assert
        expect(result).toBe(target); // Should return self for chaining
        expect(target.x).toBe(source.x);
        expect(target.y).toBe(source.y);
      });
    });
  });

  describe('Given Vector2 arithmetic operations', () => {
    describe('When adding two vectors', () => {
      it('Then it should return a new vector with summed components', () => {
        // Arrange
        const vector1 = new Vector2(3, 4);
        const vector2 = new Vector2(1, 2);

        // Act
        const result = vector1.add(vector2);

        // Assert
        expect(result).not.toBe(vector1); // Should be new instance
        expect(result.x).toBe(4);
        expect(result.y).toBe(6);
        expect(vector1.x).toBe(3); // Original should be unchanged
        expect(vector1.y).toBe(4);
      });
    });

    describe('When adding in place', () => {
      it('Then it should modify the original vector', () => {
        // Arrange
        const vector1 = new Vector2(3, 4);
        const vector2 = new Vector2(1, 2);

        // Act
        const result = vector1.addInPlace(vector2);

        // Assert
        expect(result).toBe(vector1); // Should return self
        expect(vector1.x).toBe(4);
        expect(vector1.y).toBe(6);
      });
    });

    describe('When subtracting two vectors', () => {
      it('Then it should return a new vector with subtracted components', () => {
        // Arrange
        const vector1 = new Vector2(5, 7);
        const vector2 = new Vector2(2, 3);

        // Act
        const result = vector1.subtract(vector2);

        // Assert
        expect(result).not.toBe(vector1);
        expect(result.x).toBe(3);
        expect(result.y).toBe(4);
        expect(vector1.x).toBe(5); // Original unchanged
        expect(vector1.y).toBe(7);
      });
    });

    describe('When subtracting in place', () => {
      it('Then it should modify the original vector', () => {
        // Arrange
        const vector1 = new Vector2(5, 7);
        const vector2 = new Vector2(2, 3);

        // Act
        const result = vector1.subtractInPlace(vector2);

        // Assert
        expect(result).toBe(vector1);
        expect(vector1.x).toBe(3);
        expect(vector1.y).toBe(4);
      });
    });

    describe('When multiplying by scalar', () => {
      it('Then it should return a new vector with scaled components', () => {
        // Arrange
        const vector = new Vector2(3, 4);
        const scalar = 2;

        // Act
        const result = vector.multiply(scalar);

        // Assert
        expect(result).not.toBe(vector);
        expect(result.x).toBe(6);
        expect(result.y).toBe(8);
        expect(vector.x).toBe(3); // Original unchanged
        expect(vector.y).toBe(4);
      });
    });

    describe('When multiplying in place', () => {
      it('Then it should modify the original vector', () => {
        // Arrange
        const vector = new Vector2(3, 4);
        const scalar = 2;

        // Act
        const result = vector.multiplyInPlace(scalar);

        // Assert
        expect(result).toBe(vector);
        expect(vector.x).toBe(6);
        expect(vector.y).toBe(8);
      });
    });

    describe('When dividing by scalar', () => {
      it('Then it should return a new vector with divided components', () => {
        // Arrange
        const vector = new Vector2(6, 8);
        const scalar = 2;

        // Act
        const result = vector.divide(scalar);

        // Assert
        expect(result).not.toBe(vector);
        expect(result.x).toBe(3);
        expect(result.y).toBe(4);
        expect(vector.x).toBe(6); // Original unchanged
        expect(vector.y).toBe(8);
      });
    });

    describe('When dividing by zero', () => {
      it('Then it should throw an error', () => {
        // Arrange
        const vector = new Vector2(6, 8);

        // Act & Assert
        expect(() => vector.divide(0)).toThrow('Division by zero');
      });
    });
  });

  describe('Given Vector2 magnitude operations', () => {
    describe('When calculating length of a vector', () => {
      it('Then it should return the correct magnitude', () => {
        // Arrange
        const vector = new Vector2(3, 4); // 3-4-5 triangle

        // Act
        const length = vector.length();

        // Assert
        expect(length).toBe(5);
      });

      it('Then magnitude should be an alias for length', () => {
        // Arrange
        const vector = new Vector2(3, 4);

        // Act
        const length = vector.length();
        const magnitude = vector.magnitude();

        // Assert
        expect(magnitude).toBe(length);
      });
    });

    describe('When calculating squared length', () => {
      it('Then it should return length squared without square root', () => {
        // Arrange
        const vector = new Vector2(3, 4);

        // Act
        const lengthSquared = vector.lengthSquared();

        // Assert
        expect(lengthSquared).toBe(25); // 3² + 4² = 9 + 16 = 25
      });
    });

    describe('When normalizing a vector', () => {
      it('Then it should return a unit vector in the same direction', () => {
        // Arrange
        const vector = new Vector2(3, 4);

        // Act
        const normalized = vector.normalize();

        // Assert
        expect(normalized).not.toBe(vector);
        expect(normalized.length()).toBeCloseTo(1, 10);
        expect(normalized.x).toBeCloseTo(0.6, 10); // 3/5
        expect(normalized.y).toBeCloseTo(0.8, 10); // 4/5
      });

      it('Then normalizing zero vector should return zero vector', () => {
        // Arrange
        const vector = new Vector2(0, 0);

        // Act
        const normalized = vector.normalize();

        // Assert
        expect(normalized.x).toBe(0);
        expect(normalized.y).toBe(0);
      });
    });

    describe('When normalizing in place', () => {
      it('Then it should modify the original vector to unit length', () => {
        // Arrange
        const vector = new Vector2(3, 4);

        // Act
        const result = vector.normalizeInPlace();

        // Assert
        expect(result).toBe(vector);
        expect(vector.length()).toBeCloseTo(1, 10);
        expect(vector.x).toBeCloseTo(0.6, 10);
        expect(vector.y).toBeCloseTo(0.8, 10);
      });
    });
  });

  describe('Given Vector2 geometric operations', () => {
    describe('When calculating dot product', () => {
      it('Then it should return the correct scalar value', () => {
        // Arrange
        const vector1 = new Vector2(2, 3);
        const vector2 = new Vector2(4, 5);

        // Act
        const dotProduct = vector1.dot(vector2);

        // Assert
        expect(dotProduct).toBe(23); // 2*4 + 3*5 = 8 + 15 = 23
      });

      it('Then dot product with perpendicular vectors should be zero', () => {
        // Arrange
        const vector1 = new Vector2(1, 0);
        const vector2 = new Vector2(0, 1);

        // Act
        const dotProduct = vector1.dot(vector2);

        // Assert
        expect(dotProduct).toBe(0);
      });
    });

    describe('When calculating cross product', () => {
      it('Then it should return the z-component of 3D cross product', () => {
        // Arrange
        const vector1 = new Vector2(2, 3);
        const vector2 = new Vector2(4, 5);

        // Act
        const crossProduct = vector1.cross(vector2);

        // Assert
        expect(crossProduct).toBe(-2); // 2*5 - 3*4 = 10 - 12 = -2
      });
    });

    describe('When calculating distance between vectors', () => {
      it('Then it should return the correct distance', () => {
        // Arrange
        const vector1 = new Vector2(0, 0);
        const vector2 = new Vector2(3, 4);

        // Act
        const distance = vector1.distance(vector2);

        // Assert
        expect(distance).toBe(5);
      });
    });

    describe('When calculating squared distance', () => {
      it('Then it should return distance squared', () => {
        // Arrange
        const vector1 = new Vector2(0, 0);
        const vector2 = new Vector2(3, 4);

        // Act
        const distanceSquared = vector1.distanceSquared(vector2);

        // Assert
        expect(distanceSquared).toBe(25);
      });
    });

    describe('When calculating angle of vector', () => {
      it('Then it should return angle in radians', () => {
        // Arrange
        const vector = new Vector2(1, 0); // Points right

        // Act
        const angle = vector.angle();

        // Assert
        expect(angle).toBe(0);
      });

      it('Then it should return correct angle for upward vector', () => {
        // Arrange
        const vector = new Vector2(0, -1); // Points up

        // Act
        const angle = vector.angle();

        // Assert
        expect(angle).toBeCloseTo(-Math.PI / 2, 10);
      });
    });

    describe('When calculating angle between vectors', () => {
      it('Then it should return the angle between two vectors', () => {
        // Arrange
        const vector1 = new Vector2(1, 0);
        const vector2 = new Vector2(0, 1);

        // Act
        const angle = vector1.angleTo(vector2);

        // Assert
        expect(angle).toBeCloseTo(Math.PI / 2, 10); // 90 degrees
      });
    });
  });

  describe('Given Vector2 transformation operations', () => {
    describe('When rotating a vector', () => {
      it('Then it should return a new rotated vector', () => {
        // Arrange
        const vector = new Vector2(1, 0);
        const angle = Math.PI / 2; // 90 degrees

        // Act
        const rotated = vector.rotate(angle);

        // Assert
        expect(rotated).not.toBe(vector);
        expect(rotated.x).toBeCloseTo(0, 10);
        expect(rotated.y).toBeCloseTo(1, 10);
        expect(vector.x).toBe(1); // Original unchanged
        expect(vector.y).toBe(0);
      });
    });

    describe('When rotating in place', () => {
      it('Then it should modify the original vector', () => {
        // Arrange
        const vector = new Vector2(1, 0);
        const angle = Math.PI / 2;

        // Act
        const result = vector.rotateInPlace(angle);

        // Assert
        expect(result).toBe(vector);
        expect(vector.x).toBeCloseTo(0, 10);
        expect(vector.y).toBeCloseTo(1, 10);
      });
    });

    describe('When getting perpendicular vector', () => {
      it('Then it should return a vector rotated 90 degrees', () => {
        // Arrange
        const vector = new Vector2(3, 4);

        // Act
        const perpendicular = vector.perpendicular();

        // Assert
        expect(perpendicular.x).toBe(-4);
        expect(perpendicular.y).toBe(3);
        expect(vector.dot(perpendicular)).toBe(0); // Should be perpendicular
      });
    });

    describe('When reflecting a vector', () => {
      it('Then it should return the reflected vector', () => {
        // Arrange
        const vector = new Vector2(1, 1);
        const normal = new Vector2(0, 1); // Vertical normal

        // Act
        const reflected = vector.reflect(normal);

        // Assert
        expect(reflected.x).toBeCloseTo(1, 10);
        expect(reflected.y).toBeCloseTo(-1, 10);
      });
    });
  });

  describe('Given Vector2 interpolation operations', () => {
    describe('When interpolating between vectors', () => {
      it('Then it should return interpolated vector at t=0', () => {
        // Arrange
        const vector1 = new Vector2(0, 0);
        const vector2 = new Vector2(10, 10);
        const t = 0;

        // Act
        const interpolated = vector1.lerp(vector2, t);

        // Assert
        expect(interpolated.x).toBe(0);
        expect(interpolated.y).toBe(0);
      });

      it('Then it should return interpolated vector at t=1', () => {
        // Arrange
        const vector1 = new Vector2(0, 0);
        const vector2 = new Vector2(10, 10);
        const t = 1;

        // Act
        const interpolated = vector1.lerp(vector2, t);

        // Assert
        expect(interpolated.x).toBe(10);
        expect(interpolated.y).toBe(10);
      });

      it('Then it should return interpolated vector at t=0.5', () => {
        // Arrange
        const vector1 = new Vector2(0, 0);
        const vector2 = new Vector2(10, 10);
        const t = 0.5;

        // Act
        const interpolated = vector1.lerp(vector2, t);

        // Assert
        expect(interpolated.x).toBe(5);
        expect(interpolated.y).toBe(5);
      });
    });
  });

  describe('Given Vector2 utility operations', () => {
    describe('When comparing vectors for equality', () => {
      it('Then it should return true for identical vectors', () => {
        // Arrange
        const vector1 = new Vector2(3, 4);
        const vector2 = new Vector2(3, 4);

        // Act
        const isEqual = vector1.equals(vector2);

        // Assert
        expect(isEqual).toBe(true);
      });

      it('Then it should return false for different vectors', () => {
        // Arrange
        const vector1 = new Vector2(3, 4);
        const vector2 = new Vector2(3, 5);

        // Act
        const isEqual = vector1.equals(vector2);

        // Assert
        expect(isEqual).toBe(false);
      });

      it('Then it should handle epsilon tolerance', () => {
        // Arrange
        const vector1 = new Vector2(3, 4);
        const vector2 = new Vector2(3.0001, 4.0001);
        const epsilon = 0.001;

        // Act
        const isEqual = vector1.equals(vector2, epsilon);

        // Assert
        expect(isEqual).toBe(true);
      });
    });

    describe('When converting to string', () => {
      it('Then it should return formatted string representation', () => {
        // Arrange
        const vector = new Vector2(3, 4);

        // Act
        const stringRepresentation = vector.toString();

        // Assert
        expect(stringRepresentation).toBe('Vector2(3.000, 4.000)');
      });
    });

    describe('When converting to array', () => {
      it('Then it should return array with x and y values', () => {
        // Arrange
        const vector = new Vector2(3, 4);

        // Act
        const array = vector.toArray();

        // Assert
        expect(array).toEqual([3, 4]);
        expect(Array.isArray(array)).toBe(true);
      });
    });
  });

  describe('Given Vector2 static methods', () => {
    describe('When creating vector from angle', () => {
      it('Then it should create unit vector at specified angle', () => {
        // Arrange
        const angle = Math.PI / 2; // 90 degrees

        // Act
        const vector = Vector2.fromAngle(angle);

        // Assert
        expect(vector.x).toBeCloseTo(0, 10);
        expect(vector.y).toBeCloseTo(1, 10);
        expect(vector.length()).toBeCloseTo(1, 10);
      });

      it('Then it should create vector with specified length', () => {
        // Arrange
        const angle = 0; // 0 degrees
        const length = 5;

        // Act
        const vector = Vector2.fromAngle(angle, length);

        // Assert
        expect(vector.x).toBeCloseTo(5, 10);
        expect(vector.y).toBeCloseTo(0, 10);
        expect(vector.length()).toBeCloseTo(5, 10);
      });
    });

    describe('When creating vector from array', () => {
      it('Then it should create vector with array values', () => {
        // Arrange
        const array: [number, number] = [7, 8];

        // Act
        const vector = Vector2.fromArray(array);

        // Assert
        expect(vector.x).toBe(7);
        expect(vector.y).toBe(8);
      });
    });

    describe('When using static lerp', () => {
      it('Then it should interpolate between two vectors', () => {
        // Arrange
        const vector1 = new Vector2(0, 0);
        const vector2 = new Vector2(10, 10);
        const t = 0.3;

        // Act
        const interpolated = Vector2.lerp(vector1, vector2, t);

        // Assert
        expect(interpolated.x).toBe(3);
        expect(interpolated.y).toBe(3);
      });
    });

    describe('When using static distance', () => {
      it('Then it should calculate distance between two vectors', () => {
        // Arrange
        const vector1 = new Vector2(0, 0);
        const vector2 = new Vector2(3, 4);

        // Act
        const distance = Vector2.distance(vector1, vector2);

        // Assert
        expect(distance).toBe(5);
      });
    });

    describe('When using static dot product', () => {
      it('Then it should calculate dot product of two vectors', () => {
        // Arrange
        const vector1 = new Vector2(2, 3);
        const vector2 = new Vector2(4, 5);

        // Act
        const dotProduct = Vector2.dot(vector1, vector2);

        // Assert
        expect(dotProduct).toBe(23);
      });
    });

    describe('When using static cross product', () => {
      it('Then it should calculate cross product of two vectors', () => {
        // Arrange
        const vector1 = new Vector2(2, 3);
        const vector2 = new Vector2(4, 5);

        // Act
        const crossProduct = Vector2.cross(vector1, vector2);

        // Assert
        expect(crossProduct).toBe(-2);
      });
    });
  });
});