package com.continuuity.data2.datafabric.dataset.type;

import com.continuuity.common.lang.jar.JarClassLoader;
import com.continuuity.data2.dataset2.manager.inmemory.InMemoryDatasetDefinitionRegistry;
import com.continuuity.internal.data.dataset.DatasetDefinition;
import com.continuuity.internal.data.dataset.module.DatasetDefinitionRegistry;
import com.continuuity.internal.data.dataset.module.DatasetModule;
import com.continuuity.internal.lang.ClassLoaders;
import com.google.common.base.Throwables;
import org.apache.twill.filesystem.LocationFactory;

import java.io.IOException;
import java.util.List;

/**
 * Loads {@link DatasetDefinition} using its metadata info
 */
public class DatasetDefinitionLoader {
  private final LocationFactory locationFactory;

  /**
   * Creates instance of {@link DatasetDefinitionLoader}
   * @param locationFactory instance of {@link LocationFactory} used to access dataset modules jars
   */
  public DatasetDefinitionLoader(LocationFactory locationFactory) {
    this.locationFactory = locationFactory;
  }

  public <T extends DatasetDefinition> T load(DatasetTypeMeta meta) throws IOException {
    return load(meta, new InMemoryDatasetDefinitionRegistry());
  }

  public <T extends DatasetDefinition> T load(DatasetTypeMeta meta, DatasetDefinitionRegistry registry)
    throws IOException {

    ClassLoader classLoader = DatasetDefinitionLoader.class.getClassLoader();
    List<DatasetModuleMeta> modulesToLoad = meta.getModules();
    for (DatasetModuleMeta moduleMeta : modulesToLoad) {
      // for default "system" modules it can be null, see getJarLocation() javadoc
      if (moduleMeta.getJarLocation() != null) {
        classLoader = new JarClassLoader(locationFactory.create(moduleMeta.getJarLocation()), classLoader);
      }
      DatasetModule module;
      try {
        Class<?> moduleClass = ClassLoaders.loadClass(moduleMeta.getClassName(), classLoader, this);
        module = (DatasetModule) moduleClass.newInstance();
      } catch (Exception e) {
        throw Throwables.propagate(e);
      }
      module.register(registry);
    }

    return registry.get(meta.getName());
  }
}
