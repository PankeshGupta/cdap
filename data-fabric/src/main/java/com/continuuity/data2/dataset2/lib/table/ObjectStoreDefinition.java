package com.continuuity.data2.dataset2.lib.table;

import com.continuuity.api.dataset.DatasetAdmin;
import com.continuuity.api.dataset.DatasetDefinition;
import com.continuuity.api.dataset.DatasetProperties;
import com.continuuity.api.dataset.DatasetSpecification;
import com.continuuity.api.dataset.lib.AbstractDatasetDefinition;
import com.continuuity.api.dataset.lib.KeyValueTable;
import com.continuuity.internal.io.Schema;
import com.continuuity.internal.io.TypeRepresentation;
import com.google.common.base.Preconditions;
import com.google.gson.Gson;

import java.io.IOException;

/**
 * DatasetDefinition for {@link ObjectStoreDataset}.
 *
 * @param <T> Type of object that the {@link ObjectStoreDataset} will store.
 */
public class ObjectStoreDefinition<T>
  extends AbstractDatasetDefinition<ObjectStoreDataset<T>, DatasetAdmin> {

  private static final Gson GSON = new Gson();

  private final DatasetDefinition<? extends KeyValueTable, ?> tableDef;

  public ObjectStoreDefinition(String name, DatasetDefinition<? extends KeyValueTable, ?> keyValueDef) {
    super(name);
    Preconditions.checkArgument(keyValueDef != null, "KeyValueTable definition is required");
    this.tableDef = keyValueDef;
  }

  @Override
  public DatasetSpecification configure(String instanceName, DatasetProperties properties) {
    Preconditions.checkArgument(properties.getProperties().containsKey("type"));
    Preconditions.checkArgument(properties.getProperties().containsKey("schema"));
    return DatasetSpecification.builder(instanceName, getName())
      .properties(properties.getProperties())
      .datasets(tableDef.configure("objects", properties))
      .build();
  }

  @Override
  public DatasetAdmin getAdmin(DatasetSpecification spec) throws IOException {
    return tableDef.getAdmin(spec.getSpecification("objects"));
  }

  @Override
  public ObjectStoreDataset<T> getDataset(DatasetSpecification spec) throws IOException {
    DatasetSpecification kvTableSpec = spec.getSpecification("objects");
    KeyValueTable table = tableDef.getDataset(kvTableSpec);

    TypeRepresentation typeRep = GSON.fromJson(spec.getProperty("type"), TypeRepresentation.class);
    Schema schema = GSON.fromJson(spec.getProperty("schema"), Schema.class);
    return new ObjectStoreDataset<T>(spec.getName(), table, typeRep, schema);
  }

}
