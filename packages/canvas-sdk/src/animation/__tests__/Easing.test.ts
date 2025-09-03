import { Easing } from '../Easing';

describe('Easing', () => {
  test('should provide linear easing function', () => {
    expect(Easing.linear(0)).toBe(0);
    expect(Easing.linear(0.5)).toBe(0.5);
    expect(Easing.linear(1)).toBe(1);
  });

  test('should provide quad easing functions', () => {
    expect(Easing.quadIn(0)).toBe(0);
    expect(Easing.quadIn(1)).toBe(1);
    
    expect(Easing.quadOut(0)).toBe(0);
    expect(Easing.quadOut(1)).toBe(1);
    
    expect(Easing.quadInOut(0)).toBe(0);
    expect(Easing.quadInOut(0.5)).toBe(0.5);
    expect(Easing.quadInOut(1)).toBe(1);
  });

  test('should provide cubic easing functions', () => {
    expect(Easing.cubicIn(0)).toBe(0);
    expect(Easing.cubicIn(1)).toBe(1);
    
    expect(Easing.cubicOut(0)).toBe(0);
    expect(Easing.cubicOut(1)).toBe(1);
    
    expect(Easing.cubicInOut(0)).toBe(0);
    expect(Easing.cubicInOut(0.5)).toBe(0.5);
    expect(Easing.cubicInOut(1)).toBe(1);
  });

  test('should provide sine easing functions', () => {
    expect(Easing.sineIn(0)).toBe(0);
    expect(Easing.sineIn(1)).toBeCloseTo(1);
    
    expect(Easing.sineOut(0)).toBe(0);
    expect(Easing.sineOut(1)).toBeCloseTo(1);
    
    expect(Easing.sineInOut(0)).toBe(0);
    expect(Easing.sineInOut(0.5)).toBeCloseTo(0.5);
    expect(Easing.sineInOut(1)).toBeCloseTo(1);
  });

  test('should provide bounce easing functions', () => {
    expect(Easing.bounceOut(0)).toBe(0);
    expect(Easing.bounceOut(1)).toBe(1);
    
    expect(Easing.bounceIn(0)).toBe(0);
    expect(Easing.bounceIn(1)).toBe(1);
    
    expect(Easing.bounceInOut(0)).toBe(0);
    expect(Easing.bounceInOut(0.5)).toBe(0.5);
    expect(Easing.bounceInOut(1)).toBe(1);
  });

  test('should get easing function by name', () => {
    const linearFunc = Easing.get('linear');
    expect(linearFunc).toBe(Easing.linear);
    
    const quadInFunc = Easing.get('quadIn');
    expect(quadInFunc).toBe(Easing.quadIn);
    
    const unknownFunc = Easing.get('unknown');
    expect(unknownFunc).toBe(Easing.linear);
  });

  test('should handle edge cases', () => {
    // Test exponential functions at edge cases
    expect(Easing.expoIn(0)).toBe(0);
    expect(Easing.expoIn(1)).toBe(1);
    
    expect(Easing.expoOut(0)).toBe(0);
    expect(Easing.expoOut(1)).toBe(1);
    
    // Test elastic functions at edge cases
    expect(Easing.elasticIn(0)).toBe(0);
    expect(Easing.elasticIn(1)).toBe(1);
    
    expect(Easing.elasticOut(0)).toBe(0);
    expect(Easing.elasticOut(1)).toBe(1);
  });
});