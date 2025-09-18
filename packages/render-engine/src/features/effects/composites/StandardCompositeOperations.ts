/**
 * 标准复合操作
 */

import { BaseCompositeOperation } from './BaseCompositeOperation';
import {
  CompositeOperation,
  CompositeConfig,
  ICompositeOperation
} from '../types/CompositeTypes';

/**
 * Source Over 复合操作
 */
export class SourceOverComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.SOURCE_OVER, config);
  }

  clone(): ICompositeOperation {
    return new SourceOverComposite({ ...this._config });
  }
}

/**
 * Source Atop 复合操作
 */
export class SourceAtopComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.SOURCE_ATOP, config);
  }

  clone(): ICompositeOperation {
    return new SourceAtopComposite({ ...this._config });
  }
}

/**
 * Source In 复合操作
 */
export class SourceInComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.SOURCE_IN, config);
  }

  clone(): ICompositeOperation {
    return new SourceInComposite({ ...this._config });
  }
}

/**
 * Source Out 复合操作
 */
export class SourceOutComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.SOURCE_OUT, config);
  }

  clone(): ICompositeOperation {
    return new SourceOutComposite({ ...this._config });
  }
}

/**
 * Destination Over 复合操作
 */
export class DestinationOverComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.DESTINATION_OVER, config);
  }

  clone(): ICompositeOperation {
    return new DestinationOverComposite({ ...this._config });
  }
}

/**
 * Destination Atop 复合操作
 */
export class DestinationAtopComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.DESTINATION_ATOP, config);
  }

  clone(): ICompositeOperation {
    return new DestinationAtopComposite({ ...this._config });
  }
}

/**
 * Destination In 复合操作
 */
export class DestinationInComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.DESTINATION_IN, config);
  }

  clone(): ICompositeOperation {
    return new DestinationInComposite({ ...this._config });
  }
}

/**
 * Destination Out 复合操作
 */
export class DestinationOutComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.DESTINATION_OUT, config);
  }

  clone(): ICompositeOperation {
    return new DestinationOutComposite({ ...this._config });
  }
}

/**
 * Lighter 复合操作
 */
export class LighterComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.LIGHTER, config);
  }

  clone(): ICompositeOperation {
    return new LighterComposite({ ...this._config });
  }
}

/**
 * Copy 复合操作
 */
export class CopyComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.COPY, config);
  }

  clone(): ICompositeOperation {
    return new CopyComposite({ ...this._config });
  }
}

/**
 * XOR 复合操作
 */
export class XORComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.XOR, config);
  }

  clone(): ICompositeOperation {
    return new XORComposite({ ...this._config });
  }
}